package kz.finmentor.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import kz.finmentor.model.enums.EmploymentType;
import lombok.Data;

import java.time.LocalDate;

@Data
public class IncomeRequest {
    @NotNull
    @Positive
    private Double amount;
    private String description;
    @NotNull
    private LocalDate incomeDate;
    private EmploymentType employmentType;
}
