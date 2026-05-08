package kz.finmentor.model;

import jakarta.persistence.*;
import kz.finmentor.model.enums.CriteriaType;
import lombok.*;

@Entity
@Table(name = "document_criteria_values")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentCriteriaValue {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id", nullable = false)
    private Document document;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id", nullable = false)
    private ContractTemplate template;

    @Column(nullable = false)
    private String criteriaLabel;

    @Enumerated(EnumType.STRING)
    private CriteriaType criteriaType;

    @Column(columnDefinition = "TEXT")
    private String extractedValue;

    @Column(columnDefinition = "TEXT")
    private String editedValue;

    @Column(nullable = false, columnDefinition = "boolean not null default false")
    @Builder.Default
    private boolean autoDiscovered = false;
}
