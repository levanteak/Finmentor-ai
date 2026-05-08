package kz.finmentor.repository;

import kz.finmentor.model.TemplateCriteria;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface TemplateCriteriaRepository extends JpaRepository<TemplateCriteria, Long> {
    List<TemplateCriteria> findByTemplateIdOrderByDisplayOrderAsc(Long templateId);

    @Modifying
    @Query("DELETE FROM TemplateCriteria t WHERE t.template.id = :templateId")
    void deleteByTemplateId(Long templateId);
}
