package com.panda_bobba.spring_bobba.controller;

import java.time.Instant;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import com.panda_bobba.spring_bobba.config.ApiSecurityConfig;
import com.panda_bobba.spring_bobba.model.Role;
import com.panda_bobba.spring_bobba.services.UserRegistrationService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class ApiAuthController {
    private static final int SESSION_SECONDS = 1800;
    private static final int MAX_PASSWORD_BYTES = 72;
    private final AuthenticationManager manager;
    private final JwtEncoder encoder;
    private final UserRegistrationService registration;

    public ApiAuthController(AuthenticationManager manager, JwtEncoder encoder, UserRegistrationService registration) {
        this.manager = manager;
        this.encoder = encoder;
        this.registration = registration;
    }

    public record Login(@NotBlank String username, @NotBlank String password) {}

    public record Register(
        @NotBlank(message = "Ingresa un nombre de usuario.")
        @Pattern(regexp = "[A-Za-z0-9][A-Za-z0-9._-]{2,49}",
            message = "Usa de 3 a 50 caracteres. Empieza con una letra o un número y usa letras, números, puntos, guiones o guiones bajos.")
        String username,
        @NotBlank(message = "Ingresa una contraseña.")
        @Size(min = 12, max = MAX_PASSWORD_BYTES, message = "Usa una contraseña de 12 a 72 caracteres.")
        String password
    ) {}

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody Register datos) {
        if (datos.password().getBytes(StandardCharsets.UTF_8).length > MAX_PASSWORD_BYTES) {
            return ApiExceptionHandler.invalidFields(Map.of("password", "Esta contraseña es demasiado larga. Usa hasta 72 bytes."));
        }
        var user = registration.register(datos.username(), datos.password());
        return session(user.getUsername(), user.getRoles().stream().map(Role::getName).toList(), HttpStatus.CREATED);
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@Valid @RequestBody Login login) {
        Authentication auth;
        try {
            auth = manager.authenticate(new UsernamePasswordAuthenticationToken(login.username(), login.password()));
        } catch (AuthenticationException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciales incorrectas");
        }
        return session(auth.getName(), auth.getAuthorities().stream().map(GrantedAuthority::getAuthority).toList(), HttpStatus.OK);
    }

    private ResponseEntity<Map<String, Object>> session(String username, List<String> roles, HttpStatus status) {
        var now = Instant.now();
        var claims = JwtClaimsSet.builder().issuer(ApiSecurityConfig.ISSUER).subject(username)
            .issuedAt(now).expiresAt(now.plusSeconds(SESSION_SECONDS)).claim("roles", roles).build();
        var token = encoder.encode(JwtEncoderParameters.from(claims)).getTokenValue();
        return ResponseEntity.status(status).cacheControl(CacheControl.noStore()).body(Map.of(
            "accessToken", token, "tokenType", "Bearer", "expiresIn", SESSION_SECONDS,
            "username", username, "roles", roles));
    }

    @GetMapping("/me")
    public Map<String, Object> me(Authentication auth) {
        return Map.of("username", auth.getName(), "roles", auth.getAuthorities());
    }
}
