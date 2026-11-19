package com.panda_bobba.spring_bobba.controller;

import java.util.List;
import com.panda_bobba.spring_bobba.services.ApiTokens;
import com.panda_bobba.spring_bobba.services.BrowserSessions;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/session")
public class BrowserSessionController {
    private final ApiTokens tokens;
    private final BrowserSessions sessions;

    public BrowserSessionController(ApiTokens tokens, BrowserSessions sessions) {
        this.tokens = tokens;
        this.sessions = sessions;
    }

    public record Identity(String username, List<String> roles) {}

    public record CsrfResponse(String headerName, String token) {}

    @GetMapping("/csrf")
    public CsrfResponse csrf(CsrfToken token) {
        return new CsrfResponse(token.getHeaderName(), token.getToken());
    }

    @PostMapping("/login")
    public ApiTokens.Token login(@Valid @RequestBody ApiAuthController.Login credentials, HttpServletRequest request) {
        var auth = tokens.authenticate(credentials.username(), credentials.password());
        var session = sessions.start(request, auth.getName());
        return tokens.issue(auth, session);
    }

    @GetMapping
    public Identity status(HttpServletRequest request) {
        var auth = account(request, sessions.current(request));
        return new Identity(auth.getName(), auth.getAuthorities().stream().map(GrantedAuthority::getAuthority).toList());
    }

    @GetMapping("/token")
    public ApiTokens.Token token(HttpServletRequest request) {
        var session = sessions.current(request);
        return tokens.issue(account(request, session), session);
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(HttpServletRequest request) {
        sessions.end(request);
    }

    private Authentication account(HttpServletRequest request, BrowserSessions.Session session) {
        var auth = session == null ? null : sessions.account(session);
        if (auth == null) {
            if (session != null) sessions.end(request);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Inicia sesión para continuar");
        }
        return auth;
    }
}
