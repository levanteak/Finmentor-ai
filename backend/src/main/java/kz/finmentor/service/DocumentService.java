package kz.finmentor.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import kz.finmentor.model.Document;
import kz.finmentor.model.User;
import kz.finmentor.repository.DocumentRepository;
import kz.finmentor.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class DocumentService {

    @Value("${file.upload.dir}")
    private String uploadDir;

    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;
    private final AiServiceClient aiServiceClient;
    private final ObjectMapper objectMapper;

    public Document uploadAndAnalyze(MultipartFile file, String userEmail) throws IOException {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        String originalName = file.getOriginalFilename();
        String filename = UUID.randomUUID() + "_" + originalName;
        Path uploadPath = Paths.get(uploadDir);
        Files.createDirectories(uploadPath);
        Path filePath = uploadPath.resolve(filename);
        Files.write(filePath, file.getBytes());

        String extractedText = extractText(filePath.toFile(), originalName);
        log.info("Extracted text length for '{}': {} chars", originalName, extractedText.length());

        if (extractedText.isBlank() || extractedText.equals("Не удалось извлечь текст из документа.")) {
            log.info("PDFBox returned blank, falling back to AI service extraction for '{}'", originalName);
            extractedText = aiServiceClient.extractTextFromFile(file);
            log.info("AI service extracted {} chars for '{}'", extractedText.length(), originalName);
        }

        Document document = Document.builder()
                .originalFilename(originalName)
                .filePath(filePath.toString())
                .extractedText(extractedText)
                .analyzed(false)
                .user(user)
                .build();

        Document saved = documentRepository.save(document);

        Map<String, Object> analysis = aiServiceClient.analyzeDocument(extractedText);
        Map<String, Object> metadata = aiServiceClient.extractMetadata(extractedText);

        int chunks = aiServiceClient.indexDocument(saved.getId(), user.getId(), extractedText);
        log.info("Indexed {} chunks for document {}", chunks, saved.getId());

        saved.setAnalysisJson(objectMapper.writeValueAsString(analysis));
        saved.setMetadataJson(objectMapper.writeValueAsString(metadata));
        saved.setAnalyzed(true);
        saved.setAnalyzedAt(LocalDateTime.now());
        return documentRepository.save(saved);
    }

    public List<Document> getUserDocuments(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        return documentRepository.findByUserIdOrderByUploadedAtDesc(user.getId());
    }

    public Document getDocument(Long id, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        return documentRepository.findById(id)
                .filter(d -> d.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new RuntimeException("Document not found"));
    }

    public void deleteDocument(Long id, String userEmail) {
        Document doc = getDocument(id, userEmail);
        aiServiceClient.deleteDocument(doc.getId());
        try {
            Files.deleteIfExists(Paths.get(doc.getFilePath()));
        } catch (IOException e) {
            log.warn("Could not delete file: {}", doc.getFilePath());
        }
        documentRepository.delete(doc);
    }

    private String extractText(File file, String originalName) {
        if (originalName != null && originalName.toLowerCase().endsWith(".docx")) {
            return extractTextFromDocx(file);
        }
        return extractTextFromPdf(file);
    }

    private String extractTextFromPdf(File file) {
        try (PDDocument pdf = Loader.loadPDF(file)) {
            PDFTextStripper stripper = new PDFTextStripper();
            return stripper.getText(pdf);
        } catch (Exception e) {
            log.error("PDF extraction error: {}", e.getMessage());
            return "Не удалось извлечь текст из документа.";
        }
    }

    private String extractTextFromDocx(File file) {
        try (FileInputStream fis = new FileInputStream(file);
             XWPFDocument doc = new XWPFDocument(fis)) {
            return doc.getParagraphs().stream()
                    .map(XWPFParagraph::getText)
                    .filter(t -> !t.isBlank())
                    .collect(Collectors.joining("\n"));
        } catch (Exception e) {
            log.error("DOCX extraction error: {}", e.getMessage());
            return "Не удалось извлечь текст из документа.";
        }
    }
}
