package kz.finmentor.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ChatSessionResponse {
    private Long id;
    private String title;
    private LocalDateTime createdAt;
}
