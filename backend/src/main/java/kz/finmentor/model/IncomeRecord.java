package kz.finmentor.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import kz.finmentor.model.enums.EmploymentType;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "income_records")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IncomeRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Double amount;
    private String description;
    private LocalDate incomeDate;

    @Enumerated(EnumType.STRING)
    private EmploymentType employmentType;

    private Double taxIpn;
    private Double taxOpv;
    private Double totalTax;
    private LocalDate taxDeadline;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
