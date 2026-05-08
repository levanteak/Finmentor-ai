package kz.finmentor.controller;

import jakarta.validation.Valid;
import kz.finmentor.dto.ChatRequest;
import kz.finmentor.dto.ChatSessionResponse;
import kz.finmentor.model.ChatMessage;
import kz.finmentor.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    @PostMapping("/sessions")
    public ResponseEntity<ChatSessionResponse> createSession(
            @RequestBody(required = false) Map<String, String> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        String title = body != null ? body.get("title") : null;
        return ResponseEntity.ok(chatService.createSession(userDetails.getUsername(), title));
    }

    @GetMapping("/sessions")
    public ResponseEntity<List<ChatSessionResponse>> listSessions(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(chatService.listSessions(userDetails.getUsername()));
    }

    @DeleteMapping("/sessions/{id}")
    public ResponseEntity<Void> deleteSession(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        chatService.deleteSession(id, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    @PostMapping
    public ResponseEntity<ChatMessage> send(
            @Valid @RequestBody ChatRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(chatService.sendMessage(
                request.getMessage(), userDetails.getUsername(), request.getSessionId()));
    }

    @GetMapping("/history")
    public ResponseEntity<List<ChatMessage>> history(
            @RequestParam(required = false) Long sessionId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(chatService.getHistory(userDetails.getUsername(), sessionId));
    }
}
