package kz.finmentor.dto;

import lombok.Data;

import java.util.List;

@Data
public class SaveCriteriaRequest {
    private String filename;
    private String contractType;
    private List<CriterionDto> criteria;
}
