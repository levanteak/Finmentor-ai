package kz.finmentor.dto;

public record AiChatResult(String response, int ragChunksUsed) {
    public static AiChatResult fallback() {
        return new AiChatResult("Сервис временно недоступен. Попробуйте позже.", 0);
    }
}
