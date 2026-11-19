package com.panda_bobba.spring_bobba.services;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ApiTokens {
    private static final Duration LIFETIME = Duration.ofMinutes(30);
    private final AuthenticationManager manager;
    private final JwtEncoder encoder;

    public ApiTokens(AuthenticationManager manager, JwtEncoder encoder) {
        this.manager = manager;
        this.encoder = encoder;
    }

    public Authentication authenticate(String username, String password) {
        try {
            return manager.authenticate(new UsernamePasswordAuthenticationToken(username, password));
        } catch (AuthenticationException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciales incorrectas");
        }
    }

    public record Token(String accessToken, String tokenType, long expiresIn, String username, List<String> roles) {}

    public Token issue(Authentication auth, BrowserSessions.Session session) {
        var now = Instant.now();
        var expiry = now.plus(LIFETIME);
        if (session != null && session.expiresAt().isBefore(expiry)) {
            expiry = session.expiresAt();
        }
        var roles = auth.getAuthorities().stream().map(GrantedAuthority::getAuthority).toList();
        var claims = JwtClaimsSet.builder().issuer("panda-bobba").subject(auth.getName())
                .issuedAt(now).expiresAt(expiry).claim("roles", roles);
        if (session != null) {
            claims.claim("browserSession", session.binding());
        }
        var encoded = encoder.encode(JwtEncoderParameters.from(claims.build()));
        return new Token(encoded.getTokenValue(), "Bearer", Duration.between(now, expiry).toSeconds(), auth.getName(), roles);
    }
}
