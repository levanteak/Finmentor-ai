package kz.finmentor.dto;

import kz.finmentor.model.enums.EmploymentType;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AuthResponse {
    private String token;
    private Long userId;
    private String name;
    private String email;
    private EmploymentType employmentType;
}
