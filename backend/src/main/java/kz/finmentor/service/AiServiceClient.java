package kz.finmentor.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import kz.finmentor.dto.AiChatResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class AiServiceClient {

    @Value("${ai.service.url}")
    private String aiServiceUrl;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public Map<String, Object> analyzeDocument(String text) {
        try {
            Map<String, Object> request = Map.of("text", text);
            ResponseEntity<Map> response = restTemplate.postForEntity(
                    aiServiceUrl + "/api/v1/documents/analyze",
                    new HttpEntity<>(request, jsonHeaders()),
                    Map.class
            );
            return (Map<String, Object>) response.getBody().get("analysis");
        } catch (Exception e) {
            log.error("AI service analyze error: {}", e.getMessage());
            return fallbackAnalysis();
        }
    }

    public int indexDocument(Long documentId, Long userId, String text) {
        try {
            Map<String, Object> request = Map.of(
                    "document_id", documentId,
                    "user_id", userId,
                    "text", text
            );
            ResponseEntity<Map> response = restTemplate.postForEntity(
                    aiServiceUrl + "/api/v1/documents/index",
                    new HttpEntity<>(request, jsonHeaders()),
                    Map.class
            );
            return ((Number) response.getBody().get("chunks_indexed")).intValue();
        } catch (Exception e) {
            log.error("AI service index error: {}", e.getMessage());
            return 0;
        }
    }

    public Map<String, Object> extractMetadata(String text) {
        try {
            Map<String, Object> request = Map.of("text", text);
            ResponseEntity<Map> response = restTemplate.postForEntity(
                    aiServiceUrl + "/api/v1/documents/extract-metadata",
                    new HttpEntity<>(request, jsonHeaders()),
                    Map.class
            );
            return (Map<String, Object>) response.getBody().get("metadata");
        } catch (Exception e) {
            log.error("AI service extract-metadata error: {}", e.getMessage());
            return Map.of("contractType", "Не удалось определить", "parties", List.of());
        }
    }

    public void deleteDocument(Long documentId) {
        try {
            restTemplate.delete(aiServiceUrl + "/api/v1/documents/" + documentId);
        } catch (Exception e) {
            log.error("AI service delete error: {}", e.getMessage());
        }
    }

    public AiChatResult chat(Long userId, String message, List<Map<String, String>> history, Map<String, Object> userContext) {
        try {
            Map<String, Object> request = Map.of(
                    "user_id", userId,
                    "message", message,
                    "chat_history", history,
                    "user_context", userContext
            );
            ResponseEntity<Map> response = restTemplate.postForEntity(
                    aiServiceUrl + "/api/v1/chat",
                    new HttpEntity<>(request, jsonHeaders()),
                    Map.class
            );
            Map body = response.getBody();
            String text = (String) body.get("response");
            int ragChunksUsed = body.get("rag_chunks_used") instanceof Number n ? n.intValue() : 0;
            return new AiChatResult(text, ragChunksUsed);
        } catch (Exception e) {
            log.error("AI service chat error: {}", e.getMessage());
            return AiChatResult.fallback();
        }
    }

    public Map<String, Object> uploadDataset(org.springframework.web.multipart.MultipartFile file) {
        try {
            org.springframework.util.LinkedMultiValueMap<String, Object> body = new org.springframework.util.LinkedMultiValueMap<>();
            byte[] bytes = file.getBytes();
            String filename = file.getOriginalFilename();
            body.add("file", new org.springframework.core.io.ByteArrayResource(bytes) {
                @Override public String getFilename() { return filename; }
            });
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.MULTIPART_FORM_DATA);
            ResponseEntity<Map> response = restTemplate.postForEntity(
                    aiServiceUrl + "/api/v1/admin/datasets/upload",
                    new HttpEntity<>(body, headers), Map.class);
            return response.getBody();
        } catch (Exception e) {
            log.error("Dataset upload error: {}", e.getMessage());
            return Map.of("error", e.getMessage());
        }
    }

    public Map<String, Object> listDatasets() {
        try {
            ResponseEntity<Map> response = restTemplate.getForEntity(
                    aiServiceUrl + "/api/v1/admin/datasets", Map.class);
            return response.getBody();
        } catch (Exception e) {
            log.error("List datasets error: {}", e.getMessage());
            return Map.of("sources", List.of());
        }
    }

    public Map<String, Object> deleteDataset(String source) {
        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    aiServiceUrl + "/api/v1/admin/datasets/" + source,
                    org.springframework.http.HttpMethod.DELETE,
                    new HttpEntity<>(jsonHeaders()), Map.class);
            return response.getBody();
        } catch (Exception e) {
            log.error("Delete dataset error: {}", e.getMessage());
            return Map.of("error", e.getMessage());
        }
    }

    public String extractTextFromFile(org.springframework.web.multipart.MultipartFile file) {
        try {
            org.springframework.util.LinkedMultiValueMap<String, Object> body = new org.springframework.util.LinkedMultiValueMap<>();
            byte[] bytes = file.getBytes();
            String filename = file.getOriginalFilename();
            body.add("file", new org.springframework.core.io.ByteArrayResource(bytes) {
                @Override public String getFilename() { return filename; }
            });
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.MULTIPART_FORM_DATA);
            ResponseEntity<Map> response = restTemplate.postForEntity(
                    aiServiceUrl + "/api/v1/admin/extract-text",
                    new HttpEntity<>(body, headers), Map.class);
            Object text = response.getBody().get("text");
            return text != null ? text.toString() : "";
        } catch (Exception e) {
            log.error("AI extract-text error: {}", e.getMessage());
            return "";
        }
    }

    public String classifyContractType(String documentText, List<String> templateTypes) {
        try {
            Map<String, Object> request = Map.of("document_text", documentText, "template_types", templateTypes);
            ResponseEntity<Map> response = restTemplate.postForEntity(
                    aiServiceUrl + "/api/v1/classify-contract-type",
                    new HttpEntity<>(request, jsonHeaders()),
                    Map.class
            );
            Object result = response.getBody().get("matched_type");
            return result != null ? result.toString() : null;
        } catch (Exception e) {
            log.error("AI classify-contract-type error: {}", e.getMessage());
            return null;
        }
    }

    public String matchTemplate(String documentText) {
        try {
            String preview = documentText.length() > 2000 ? documentText.substring(0, 2000) : documentText;
            Map<String, Object> request = Map.of("document_text", preview);
            ResponseEntity<Map> response = restTemplate.postForEntity(
                    aiServiceUrl + "/api/v1/match-template",
                    new HttpEntity<>(request, jsonHeaders()),
                    Map.class
            );
            Object sourceKey = response.getBody().get("source_key");
            return sourceKey != null ? sourceKey.toString() : null;
        } catch (Exception e) {
            log.error("AI match-template error: {}", e.getMessage());
            return null;
        }
    }

    public List<Map<String, Object>> extractExtraFields(String documentText, List<String> definedLabels) {
        try {
            Map<String, Object> request = Map.of("document_text", documentText, "defined_labels", definedLabels);
            ResponseEntity<Map> response = restTemplate.postForEntity(
                    aiServiceUrl + "/api/v1/extract-extra-fields",
                    new HttpEntity<>(request, jsonHeaders()),
                    Map.class
            );
            return (List<Map<String, Object>>) response.getBody().get("fields");
        } catch (Exception e) {
            log.error("AI extract-extra-fields error: {}", e.getMessage());
            return List.of();
        }
    }

    public List<Map<String, Object>> extractCriteriaValues(String documentText, List<Map<String, String>> criteria) {
        try {
            Map<String, Object> request = Map.of("document_text", documentText, "criteria", criteria);
            ResponseEntity<Map> response = restTemplate.postForEntity(
                    aiServiceUrl + "/api/v1/extract-criteria-values",
                    new HttpEntity<>(request, jsonHeaders()),
                    Map.class
            );
            return (List<Map<String, Object>>) response.getBody().get("values");
        } catch (Exception e) {
            log.error("AI extract-criteria-values error: {}", e.getMessage());
            return List.of();
        }
    }

    private HttpHeaders jsonHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        return headers;
    }

    private Map<String, Object> fallbackAnalysis() {
        return Map.of(
                "realAnnualRate", "Не удалось определить",
                "advertisedRate", "Не удалось определить",
                "hiddenFees", List.of("AI сервис недоступен"),
                "penalties", List.of("AI сервис недоступен"),
                "redFlags", List.of("AI сервис временно недоступен"),
                "monthlyPayment", "Не удалось определить",
                "recommendation", "NEGOTIATE",
                "summary", "AI сервис временно недоступен. Обратитесь к финансовому консультанту."
        );
    }
}
