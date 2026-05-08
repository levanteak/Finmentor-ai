package kz.finmentor.dto;

import kz.finmentor.model.enums.CriteriaType;
import lombok.Data;

@Data
public class CriterionDto {
    private String label;
    private CriteriaType type;
}
