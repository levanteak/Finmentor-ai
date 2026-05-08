package kz.finmentor.repository;

import kz.finmentor.model.ContractTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ContractTemplateRepository extends JpaRepository<ContractTemplate, Long> {
    Optional<ContractTemplate> findBySourceKey(String sourceKey);
    boolean existsBySourceKey(String sourceKey);
    Optional<ContractTemplate> findByContractTypeIgnoreCase(String contractType);
}
