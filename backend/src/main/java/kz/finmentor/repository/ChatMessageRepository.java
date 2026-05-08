package kz.finmentor.repository;

import kz.finmentor.model.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findTop20ByUserIdOrderByCreatedAtDesc(Long userId);
    List<ChatMessage> findByUserIdOrderByCreatedAtAsc(Long userId);
    List<ChatMessage> findTop20BySessionIdOrderByCreatedAtDesc(Long sessionId);
    List<ChatMessage> findBySessionIdOrderByCreatedAtAsc(Long sessionId);
    void deleteBySessionId(Long sessionId);
}
