package kz.finmentor.dto;

import kz.finmentor.model.enums.CriteriaType;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CriteriaValueDto {
    private Long id;
    private String criteriaLabel;
    private CriteriaType criteriaType;
    private String extractedValue;
    private String editedValue;
    private String templateName;
    private boolean autoDiscovered;
}
