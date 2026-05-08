package kz.finmentor.service;

import kz.finmentor.dto.*;
import kz.finmentor.model.*;
import kz.finmentor.model.enums.CriteriaType;
import kz.finmentor.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.IntStream;

@Service
@Slf4j
@RequiredArgsConstructor
public class TemplateService {

    private final ContractTemplateRepository templateRepo;
    private final TemplateCriteriaRepository criteriaRepo;
    private final DocumentCriteriaValueRepository criteriaValueRepo;
    private final DocumentRepository documentRepo;
    private final AiServiceClient aiServiceClient;

    @Transactional
    public ContractTemplate createTemplate(CreateTemplateRequest request) {
        String sourceKey = UUID.randomUUID().toString();
        ContractTemplate template = templateRepo.save(ContractTemplate.builder()
                .sourceKey(sourceKey)
                .contractType(request.getContractType().trim())
                .build());
        saveTemplatecriteria(template, request.getCriteria());
        log.info("Created template '{}' with {} criteria", request.getContractType(), request.getCriteria().size());
        return templateRepo.findById(template.getId()).orElseThrow();
    }

    @Transactional
    public ContractTemplate updateTemplate(Long id, CreateTemplateRequest request) {
        ContractTemplate template = templateRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Template not found: " + id));
        template.setContractType(request.getContractType().trim());
        templateRepo.save(template);
        criteriaRepo.deleteByTemplateId(id);
        saveTemplatecriteria(template, request.getCriteria());
        log.info("Updated template '{}' with {} criteria", request.getContractType(), request.getCriteria().size());
        return templateRepo.findById(id).orElseThrow();
    }

    @Transactional
    public void deleteTemplate(Long id) {
        criteriaValueRepo.deleteByTemplateId(id);
        criteriaRepo.deleteByTemplateId(id);
        templateRepo.deleteById(id);
        log.info("Deleted template id={}", id);
    }

    public List<ContractTemplate> getAllTemplates() {
        return templateRepo.findAll();
    }

    @Transactional
    public List<CriteriaValueDto> analyzeWithTemplate(Long documentId, String userEmail, Long templateId) {
        Document document = documentRepo.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found: " + documentId));

        String extractedText = document.getExtractedText();
        log.info("analyzeWithTemplate: doc={} textLen={}", documentId,
                extractedText == null ? 0 : extractedText.length());
        if (extractedText == null || extractedText.isBlank()) {
            throw new RuntimeException("Документ не содержит текста. Загрузите документ повторно.");
        }

        ContractTemplate template = templateRepo.findById(templateId)
                .orElseThrow(() -> new RuntimeException("Тип договора не найден: " + templateId));

        List<TemplateCriteria> criteria = criteriaRepo.findByTemplateIdOrderByDisplayOrderAsc(templateId);
        if (criteria.isEmpty()) {
            throw new RuntimeException("Для типа '" + template.getContractType() + "' не заданы критерии.");
        }

        List<Map<String, String>> criteriaPayload = criteria.stream()
                .map(c -> Map.of("label", c.getLabel(), "type", c.getCriteriaType().name()))
                .toList();

        criteriaValueRepo.deleteByDocumentId(documentId);

        List<Map<String, Object>> extracted = aiServiceClient.extractCriteriaValues(extractedText, criteriaPayload);

        List<DocumentCriteriaValue> values = criteria.stream().map(criterion -> {
            String extractedValue = extracted.stream()
                    .filter(v -> {
                        String lbl = v.get("label") instanceof String s ? s : "";
                        int typeIdx = lbl.indexOf(" (тип:");
                        if (typeIdx >= 0) lbl = lbl.substring(0, typeIdx).trim();
                        return criterion.getLabel().equalsIgnoreCase(lbl);
                    })
                    .map(v -> (String) v.get("extracted_value"))
                    .findFirst()
                    .orElse("Не указано");

            return DocumentCriteriaValue.builder()
                    .document(document)
                    .template(template)
                    .criteriaLabel(criterion.getLabel())
                    .criteriaType(criterion.getCriteriaType())
                    .extractedValue(extractedValue)
                    .autoDiscovered(false)
                    .build();
        }).toList();

        List<DocumentCriteriaValue> saved = criteriaValueRepo.saveAll(values);

        // Extract additional fields not in template
        List<String> definedLabels = criteria.stream().map(TemplateCriteria::getLabel).toList();
        List<Map<String, Object>> extraFields = aiServiceClient.extractExtraFields(extractedText, definedLabels);
        if (!extraFields.isEmpty()) {
            List<DocumentCriteriaValue> extraValues = extraFields.stream()
                    .filter(f -> f.get("label") != null && f.get("value") != null)
                    .map(f -> DocumentCriteriaValue.builder()
                            .document(document)
                            .template(template)
                            .criteriaLabel(f.get("label").toString())
                            .criteriaType(CriteriaType.ADDITIONAL)
                            .extractedValue(f.get("value").toString())
                            .autoDiscovered(true)
                            .build())
                    .toList();
            saved = new java.util.ArrayList<>(saved);
            saved.addAll(criteriaValueRepo.saveAll(extraValues));
        }

        log.info("Saved {} criteria values ({} auto-discovered) for document {}",
                saved.size(), extraFields.size(), documentId);
        return toDto(saved, template.getContractType());
    }

    @Transactional(readOnly = true)
    public List<CriteriaValueDto> getCriteriaValues(Long documentId) {
        List<DocumentCriteriaValue> values = criteriaValueRepo.findByDocumentIdOrderByIdAsc(documentId);
        if (values.isEmpty()) return List.of();
        String templateName = values.get(0).getTemplate().getContractType();
        return toDto(values, templateName);
    }

    @Transactional
    public CriteriaValueDto updateCriteriaValue(Long valueId, String editedValue) {
        DocumentCriteriaValue value = criteriaValueRepo.findById(valueId)
                .orElseThrow(() -> new RuntimeException("Criteria value not found: " + valueId));
        value.setEditedValue(editedValue);
        DocumentCriteriaValue saved = criteriaValueRepo.save(value);
        return toDto(List.of(saved), saved.getTemplate().getContractType()).get(0);
    }

    private void saveTemplatecriteria(ContractTemplate template, List<CriterionDto> criteriaList) {
        List<TemplateCriteria> toSave = IntStream.range(0, criteriaList.size())
                .mapToObj(i -> {
                    CriterionDto dto = criteriaList.get(i);
                    return TemplateCriteria.builder()
                            .template(template)
                            .label(dto.getLabel())
                            .criteriaType(dto.getType())
                            .displayOrder(i)
                            .build();
                }).toList();
        criteriaRepo.saveAll(toSave);
    }

    private List<CriteriaValueDto> toDto(List<DocumentCriteriaValue> values, String templateName) {
        return values.stream().map(v -> CriteriaValueDto.builder()
                .id(v.getId())
                .criteriaLabel(v.getCriteriaLabel())
                .criteriaType(v.getCriteriaType())
                .extractedValue(v.getExtractedValue())
                .editedValue(v.getEditedValue())
                .templateName(templateName)
                .autoDiscovered(v.isAutoDiscovered())
                .build()
        ).toList();
    }
}
