package kz.finmentor.controller;

import kz.finmentor.dto.*;
import kz.finmentor.model.ContractTemplate;
import kz.finmentor.model.TemplateCriteria;
import kz.finmentor.service.TemplateService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/templates")
@RequiredArgsConstructor
public class TemplateController {

    private final TemplateService templateService;

    @PostMapping
    public ResponseEntity<ContractTemplate> createTemplate(@RequestBody CreateTemplateRequest request) {
        return ResponseEntity.ok(templateService.createTemplate(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ContractTemplate> updateTemplate(
            @PathVariable Long id,
            @RequestBody CreateTemplateRequest request) {
        return ResponseEntity.ok(templateService.updateTemplate(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTemplate(@PathVariable Long id) {
        templateService.deleteTemplate(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    public ResponseEntity<List<ContractTemplate>> getAllTemplates() {
        return ResponseEntity.ok(templateService.getAllTemplates());
    }

    @PostMapping("/documents/{documentId}/analyze-criteria")
    public ResponseEntity<List<CriteriaValueDto>> analyzeWithTemplate(
            @PathVariable Long documentId,
            @RequestBody AnalyzeCriteriaRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(templateService.analyzeWithTemplate(documentId, userDetails.getUsername(), request.getTemplateId()));
    }

    @GetMapping("/documents/{documentId}/criteria-values")
    public ResponseEntity<List<CriteriaValueDto>> getCriteriaValues(@PathVariable Long documentId) {
        return ResponseEntity.ok(templateService.getCriteriaValues(documentId));
    }

    @PutMapping("/criteria-values/{valueId}")
    public ResponseEntity<CriteriaValueDto> updateCriteriaValue(
            @PathVariable Long valueId,
            @RequestBody UpdateCriteriaValueRequest request) {
        return ResponseEntity.ok(templateService.updateCriteriaValue(valueId, request.getEditedValue()));
    }
}
