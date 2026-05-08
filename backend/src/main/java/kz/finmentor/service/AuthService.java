package kz.finmentor.service;

import kz.finmentor.dto.AuthResponse;
import kz.finmentor.dto.LoginRequest;
import kz.finmentor.dto.RegisterRequest;
import kz.finmentor.model.User;
import kz.finmentor.repository.UserRepository;
import kz.finmentor.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email уже используется");
        }
        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .employmentType(request.getEmploymentType())
                .build();
        User saved = userRepository.save(user);
        return buildResponse(saved, jwtTokenProvider.generateToken(saved.getEmail()));
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BadCredentialsException("Неверный email или пароль"));
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new BadCredentialsException("Неверный email или пароль");
        }
        return buildResponse(user, jwtTokenProvider.generateToken(user.getEmail()));
    }

    private AuthResponse buildResponse(User user, String token) {
        return AuthResponse.builder()
                .token(token)
                .userId(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .employmentType(user.getEmploymentType())
                .build();
    }
}
