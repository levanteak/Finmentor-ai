package kz.finmentor.repository;

import kz.finmentor.model.DocumentCriteriaValue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface DocumentCriteriaValueRepository extends JpaRepository<DocumentCriteriaValue, Long> {
    List<DocumentCriteriaValue> findByDocumentIdOrderByIdAsc(Long documentId);

    @Modifying
    @Query("DELETE FROM DocumentCriteriaValue d WHERE d.document.id = :documentId")
    void deleteByDocumentId(Long documentId);

    @Modifying
    @Query("DELETE FROM DocumentCriteriaValue d WHERE d.template.id = :templateId")
    void deleteByTemplateId(Long templateId);
}
