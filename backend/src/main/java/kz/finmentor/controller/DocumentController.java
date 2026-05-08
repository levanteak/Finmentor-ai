package kz.finmentor.controller;

import kz.finmentor.model.Document;
import kz.finmentor.service.DocumentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;

    @PostMapping("/upload")
    public ResponseEntity<?> upload(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserDetails userDetails) throws IOException {
        String name = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";
        if (!name.endsWith(".pdf") && !name.endsWith(".docx")) {
            return ResponseEntity.badRequest().body("Поддерживаются только PDF и DOCX файлы");
        }
        return ResponseEntity.ok(documentService.uploadAndAnalyze(file, userDetails.getUsername()));
    }

    @GetMapping
    public ResponseEntity<List<Document>> list(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(documentService.getUserDocuments(userDetails.getUsername()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Document> get(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(documentService.getDocument(id, userDetails.getUsername()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        documentService.deleteDocument(id, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }
}
