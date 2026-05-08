package kz.finmentor.dto;

import lombok.Data;

import java.util.List;

@Data
public class CreateTemplateRequest {
    private String contractType;
    private List<CriterionDto> criteria;
}
