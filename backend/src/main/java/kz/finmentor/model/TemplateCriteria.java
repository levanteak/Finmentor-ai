package kz.finmentor.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import kz.finmentor.model.enums.CriteriaType;
import lombok.*;

@Entity
@Table(name = "template_criteria")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TemplateCriteria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id", nullable = false)
    private ContractTemplate template;

    @Column(nullable = false)
    private String label;

    @Enumerated(EnumType.STRING)
    private CriteriaType criteriaType;

    private int displayOrder;
}
