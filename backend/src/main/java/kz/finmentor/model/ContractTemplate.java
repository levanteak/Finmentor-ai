package kz.finmentor.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "contract_templates")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContractTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String sourceKey;

    private String filename;

    private String contractType;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "template", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("displayOrder ASC")
    @Builder.Default
    private List<TemplateCriteria> criteria = new ArrayList<>();
}
