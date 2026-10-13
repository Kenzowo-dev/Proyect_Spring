package com.panda_bobba.spring_bobba.controller;

import java.time.Instant;
import java.util.Map;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class ApiAuthController {
    private final AuthenticationManager manager;
    private final JwtEncoder encoder;
    public ApiAuthController(AuthenticationManager manager, JwtEncoder encoder) {
        this.manager = manager;
        this.encoder = encoder;
    }
    public record Login(@NotBlank String username, @NotBlank String password) {}

    @PostMapping("/login")
    public Map<String, Object> login(@Valid @RequestBody Login login) {
        Authentication auth;
        try {
            auth = manager.authenticate(new UsernamePasswordAuthenticationToken(login.username(), login.password()));
        } catch (AuthenticationException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciales incorrectas");
        }
        var now = Instant.now();
        var roles = auth.getAuthorities().stream().map(a -> a.getAuthority()).toList();
        var claims = JwtClaimsSet.builder().issuer("panda-bobba").subject(auth.getName())
            .issuedAt(now).expiresAt(now.plusSeconds(1800)).claim("roles", roles).build();
        var token = encoder.encode(JwtEncoderParameters.from(claims)).getTokenValue();
        return Map.of("accessToken", token, "tokenType", "Bearer", "expiresIn", 1800,
            "username", auth.getName(), "roles", roles);
    }

    @GetMapping("/me")
    public Map<String, Object> me(Authentication auth) {
        return Map.of("username", auth.getName(), "roles", auth.getAuthorities());
    }
}
