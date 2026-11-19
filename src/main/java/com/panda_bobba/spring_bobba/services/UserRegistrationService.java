package com.panda_bobba.spring_bobba.services;

import java.util.Locale;
import java.util.Set;

import com.panda_bobba.spring_bobba.model.User;
import com.panda_bobba.spring_bobba.repositories.RoleRepository;
import com.panda_bobba.spring_bobba.repositories.UserRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class UserRegistrationService {
    private static final Set<String> RESERVED_USERNAMES = Set.of("admin", "user");
    private final UserRepository users;
    private final RoleRepository roles;
    private final PasswordEncoder passwords;

    public UserRegistrationService(UserRepository users, RoleRepository roles, PasswordEncoder passwords) {
        this.users = users;
        this.roles = roles;
        this.passwords = passwords;
    }

    public User register(String username, String password) {
        var normalized = username.toLowerCase(Locale.ROOT);
        if (RESERVED_USERNAMES.contains(normalized) || users.existsByUsernameIgnoreCase(normalized)) {
            throw usernameUnavailable();
        }

        var role = roles.findByName("ROLE_USER")
            .orElseThrow(() -> new IllegalStateException("El rol de cliente aún no está disponible."));
        var user = new User(normalized, passwords.encode(password), true);
        user.addRole(role);
        try {
            return users.save(user);
        } catch (DataIntegrityViolationException exception) {
            // La restricción de users.username protege dos registros simultáneos del mismo nombre.
            if (users.existsByUsernameIgnoreCase(normalized)) {
                throw usernameUnavailable();
            }
            throw exception;
        }
    }

    private ResponseStatusException usernameUnavailable() {
        return new ResponseStatusException(HttpStatus.CONFLICT, "Ese nombre de usuario no está disponible.");
    }
}
