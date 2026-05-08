package kz.finmentor.controller;

import kz.finmentor.service.AiServiceClient;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AiServiceClient aiServiceClient;

    @PostMapping("/datasets/upload")
    public ResponseEntity<Map<String, Object>> upload(
            @RequestParam("file") MultipartFile file) throws IOException {
        return ResponseEntity.ok(aiServiceClient.uploadDataset(file));
    }

    @GetMapping("/datasets")
    public ResponseEntity<Map<String, Object>> list() {
        return ResponseEntity.ok(aiServiceClient.listDatasets());
    }

    @DeleteMapping("/datasets/{source}")
    public ResponseEntity<Map<String, Object>> delete(@PathVariable String source) {
        return ResponseEntity.ok(aiServiceClient.deleteDataset(source));
    }
}
