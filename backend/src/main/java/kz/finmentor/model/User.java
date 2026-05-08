package kz.finmentor.model;

import jakarta.persistence.*;
import kz.finmentor.model.enums.EmploymentType;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private EmploymentType employmentType = EmploymentType.FREELANCE;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
