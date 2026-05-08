package kz.finmentor.service;

import kz.finmentor.dto.ChatSessionResponse;
import kz.finmentor.model.ChatMessage;
import kz.finmentor.model.ChatSession;
import kz.finmentor.model.IncomeRecord;
import kz.finmentor.model.User;
import kz.finmentor.repository.ChatMessageRepository;
import kz.finmentor.repository.ChatSessionRepository;
import kz.finmentor.repository.IncomeRecordRepository;
import kz.finmentor.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatMessageRepository chatMessageRepository;
    private final ChatSessionRepository chatSessionRepository;
    private final UserRepository userRepository;
    private final IncomeRecordRepository incomeRecordRepository;
    private final AiServiceClient aiServiceClient;

    public ChatSessionResponse createSession(String userEmail, String title) {
        User user = getUser(userEmail);
        ChatSession session = ChatSession.builder()
                .title(title != null && !title.isBlank() ? title : "Новый чат")
                .user(user)
                .build();
        return mapSession(chatSessionRepository.save(session));
    }

    public List<ChatSessionResponse> listSessions(String userEmail) {
        User user = getUser(userEmail);
        return chatSessionRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream().map(this::mapSession).collect(Collectors.toList());
    }

    @Transactional
    public void deleteSession(Long sessionId, String userEmail) {
        User user = getUser(userEmail);
        ChatSession session = chatSessionRepository.findById(sessionId)
                .filter(s -> s.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new RuntimeException("Session not found"));
        chatMessageRepository.deleteBySessionId(sessionId);
        chatSessionRepository.delete(session);
    }

    public ChatMessage sendMessage(String userMessage, String userEmail, Long sessionId) {
        User user = getUser(userEmail);
        ChatSession session = resolveSession(user, sessionId);

        if ("Новый чат".equals(session.getTitle())) {
            session.setTitle(userMessage.substring(0, Math.min(userMessage.length(), 50)));
            chatSessionRepository.save(session);
        }

        List<ChatMessage> history = chatMessageRepository
                .findTop20BySessionIdOrderByCreatedAtDesc(session.getId());
        Collections.reverse(history);

        List<Map<String, String>> historyMessages = history.stream()
                .flatMap(m -> List.of(
                        Map.of("role", "user", "content", m.getUserMessage()),
                        Map.of("role", "assistant", "content", m.getAiResponse())
                ).stream())
                .collect(Collectors.toList());

        Map<String, Object> userContext = buildUserContext(user);
        String aiResponse = aiServiceClient.chat(user.getId(), userMessage, historyMessages, userContext);

        ChatMessage message = ChatMessage.builder()
                .userMessage(userMessage)
                .aiResponse(aiResponse)
                .user(user)
                .session(session)
                .build();

        return chatMessageRepository.save(message);
    }

    public List<ChatMessage> getHistory(String userEmail, Long sessionId) {
        User user = getUser(userEmail);
        if (sessionId != null) {
            return chatMessageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
        }
        return chatMessageRepository.findByUserIdOrderByCreatedAtAsc(user.getId());
    }

    private ChatSession resolveSession(User user, Long sessionId) {
        if (sessionId != null) {
            return chatSessionRepository.findById(sessionId)
                    .filter(s -> s.getUser().getId().equals(user.getId()))
                    .orElseThrow(() -> new RuntimeException("Session not found"));
        }
        List<ChatSession> sessions = chatSessionRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
        if (!sessions.isEmpty()) return sessions.get(0);
        return chatSessionRepository.save(ChatSession.builder().title("Новый чат").user(user).build());
    }

    private Map<String, Object> buildUserContext(User user) {
        List<IncomeRecord> records = incomeRecordRepository.findByUserIdOrderByIncomeDateDesc(user.getId());
        double totalIncome = records.stream().mapToDouble(IncomeRecord::getAmount).sum();
        double totalTax = records.stream().mapToDouble(IncomeRecord::getTotalTax).sum();
        String lastIncomeInfo = records.isEmpty()
                ? "Данных о доходах нет"
                : String.format("Последний доход: %.0f тг (%s), налог: %.0f тг",
                records.get(0).getAmount(), records.get(0).getIncomeDate(), records.get(0).getTotalTax());
        return Map.of(
                "user_id", user.getId(),
                "name", user.getName(),
                "employment_type", user.getEmploymentType().name(),
                "total_income", totalIncome,
                "total_tax", totalTax,
                "last_income_info", lastIncomeInfo
        );
    }

    private ChatSessionResponse mapSession(ChatSession s) {
        return ChatSessionResponse.builder()
                .id(s.getId()).title(s.getTitle()).createdAt(s.getCreatedAt()).build();
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }
}
