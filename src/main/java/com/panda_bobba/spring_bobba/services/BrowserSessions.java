package com.panda_bobba.spring_bobba.services;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class BrowserSessions {
    private static final Duration LIFETIME = Duration.ofHours(8);
    private static final String ATTRIBUTE = BrowserSessions.class.getName();
    private final UserDetailsService users;

    public BrowserSessions(UserDetailsService users) {
        this.users = users;
    }

    public record Session(String binding, String username, Instant expiresAt) {}

    public Session start(HttpServletRequest request, String username) {
        var httpSession = request.getSession();
        request.changeSessionId();
        var session = new Session(UUID.randomUUID().toString(), username, Instant.now().plus(LIFETIME));
        httpSession.setAttribute(ATTRIBUTE, session);
        return session;
    }

    public Session current(HttpServletRequest request) {
        var httpSession = request.getSession(false);
        if (httpSession == null) {
            return null;
        }
        try {
            if (httpSession.getAttribute(ATTRIBUTE) instanceof Session session
                    && Instant.now().isBefore(session.expiresAt())) {
                return session;
            }
        } catch (IllegalStateException ex) {
            // Otra petición invalidó la sesión mientras esta la consultaba.
        }
        return null;
    }

    public Authentication account(Session session) {
        try {
            var user = users.loadUserByUsername(session.username());
            if (user.isEnabled() && user.isAccountNonLocked() && user.isAccountNonExpired()
                    && user.isCredentialsNonExpired()) {
                return UsernamePasswordAuthenticationToken.authenticated(user, null, user.getAuthorities());
            }
        } catch (UsernameNotFoundException ex) {
            return null;
        }
        return null;
    }

    public void end(HttpServletRequest request) {
        var httpSession = request.getSession(false);
        if (httpSession != null) {
            try {
                httpSession.invalidate();
            } catch (IllegalStateException ex) {
                // La sesión ya se cerró desde otra petición.
            }
        }
    }
}
