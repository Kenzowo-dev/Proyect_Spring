package com.panda_bobba.spring_bobba.controller;

import java.util.Map;
import com.panda_bobba.spring_bobba.services.ApiTokens;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class ApiAuthController {
    private final ApiTokens tokens;

    public ApiAuthController(ApiTokens tokens) {
        this.tokens = tokens;
    }

    public record Login(@NotBlank String username, @NotBlank String password) {}

    @PostMapping("/login")
    public ApiTokens.Token login(@Valid @RequestBody Login login) {
        return tokens.issue(tokens.authenticate(login.username(), login.password()), null);
    }

    @GetMapping("/me")
    public Map<String, Object> me(Authentication auth) {
        return Map.of("username", auth.getName(), "roles", auth.getAuthorities());
    }
}
