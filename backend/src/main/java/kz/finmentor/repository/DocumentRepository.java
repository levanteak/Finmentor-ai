package kz.finmentor.repository;

import kz.finmentor.model.Document;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DocumentRepository extends JpaRepository<Document, Long> {
    List<Document> findByUserIdOrderByUploadedAtDesc(Long userId);
}
