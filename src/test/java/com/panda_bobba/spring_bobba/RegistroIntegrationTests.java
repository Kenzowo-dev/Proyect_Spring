package com.panda_bobba.spring_bobba;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.panda_bobba.spring_bobba.model.Role;
import com.panda_bobba.spring_bobba.model.User;
import com.panda_bobba.spring_bobba.repositories.RoleRepository;
import com.panda_bobba.spring_bobba.repositories.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RegistroIntegrationTests {
    private static final String PASSWORD = "  Clave de prueba  ";

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired UserRepository users;
    @Autowired RoleRepository roles;
    @Autowired PasswordEncoder passwords;

    private final List<String> fixtures = new ArrayList<>();

    @AfterEach
    void limpiar() {
        fixtures.forEach(username -> users.findByUsername(username).ifPresent(user -> users.deleteById(user.getId())));
    }

    @Test
    void registraClienteConSesionValidaSinPermitirEscalarPrivilegios() throws Exception {
        fixtures.add("cliente.nuevo_1");
        var response = register(Map.of("username", "Cliente.Nuevo_1", "password", PASSWORD, "roles", List.of("ROLE_ADMIN")))
            .andExpect(status().isCreated())
            .andExpect(header().string("Cache-Control", "no-store"))
            .andExpect(jsonPath("$.username").value("cliente.nuevo_1"))
            .andExpect(jsonPath("$.tokenType").value("Bearer"))
            .andExpect(jsonPath("$.expiresIn").value(1800))
            .andExpect(jsonPath("$.roles.length()").value(1))
            .andExpect(jsonPath("$.roles[0]").value("ROLE_USER"))
            .andReturn().getResponse();

        var account = users.findByUsername("cliente.nuevo_1").orElseThrow();
        assertThat(account.isEnabled()).isTrue();
        assertThat(account.getPassword()).isNotEqualTo(PASSWORD);
        assertThat(passwords.matches(PASSWORD, account.getPassword())).isTrue();
        assertThat(account.getRoles()).extracting(Role::getName).containsExactly("ROLE_USER");

        var token = "Bearer " + json.readTree(response.getContentAsString()).get("accessToken").asText();
        mvc.perform(get("/api/auth/me").header("Authorization", token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.username").value("cliente.nuevo_1"));
        mvc.perform(get("/api/pedidos").header("Authorization", token)).andExpect(status().isForbidden());
        mvc.perform(post("/api/productos").header("Authorization", token)
            .contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isForbidden());
        login("CLIENTE.NUEVO_1", PASSWORD).andExpect(status().isOk())
            .andExpect(jsonPath("$.username").value("cliente.nuevo_1"));
        login("cliente.nuevo_1", PASSWORD.strip()).andExpect(status().isUnauthorized());
        register(Map.of("username", "Cliente.Nuevo_1", "password", PASSWORD)).andExpect(status().isConflict());
    }

    @Test
    void validaEntradasYRespetaLasCuentasExistentes() throws Exception {
        register(Map.of("username", "!cliente", "password", "corta")).andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.fieldErrors.username").isString())
            .andExpect(jsonPath("$.fieldErrors.password").isString());
        register(Map.of("username", "clave-larga", "password", "á".repeat(37))).andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.fieldErrors.password").isString());
        register(Map.of("username", "ADMIN", "password", PASSWORD)).andExpect(status().isConflict());
        register(Map.of("username", "User", "password", PASSWORD)).andExpect(status().isConflict());

        fixtures.add("CuentaAnterior");
        var legacy = new User("CuentaAnterior", passwords.encode(PASSWORD), true);
        legacy.addRole(roles.findByName("ROLE_USER").orElseThrow());
        users.save(legacy);
        login("CuentaAnterior", PASSWORD).andExpect(status().isOk())
            .andExpect(jsonPath("$.username").value("CuentaAnterior"));
        register(Map.of("username", "cuentaanterior", "password", PASSWORD)).andExpect(status().isConflict());
    }

    @Test
    void registrosConcurrentesDelMismoUsuarioCreanUnaSolaCuenta() throws Exception {
        fixtures.add("registro-paralelo");
        var start = new CyclicBarrier(2);
        var workers = Executors.newFixedThreadPool(2);
        try {
            var first = workers.submit(() -> {
                start.await(10, TimeUnit.SECONDS);
                return register(Map.of("username", "REGISTRO-PARALELO", "password", PASSWORD))
                    .andReturn().getResponse().getStatus();
            });
            var second = workers.submit(() -> {
                start.await(10, TimeUnit.SECONDS);
                return register(Map.of("username", "registro-paralelo", "password", PASSWORD))
                    .andReturn().getResponse().getStatus();
            });
            assertThat(List.of(first.get(15, TimeUnit.SECONDS), second.get(15, TimeUnit.SECONDS)))
                .containsExactlyInAnyOrder(201, 409);
            assertThat(users.findByUsername("registro-paralelo")).isPresent();
        } finally {
            workers.shutdownNow();
        }
    }

    private ResultActions register(Map<String, ?> fields) throws Exception {
        return mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
            .content(json.writeValueAsString(fields)));
    }

    private ResultActions login(String username, String password) throws Exception {
        return mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
            .content(json.writeValueAsString(Map.of("username", username, "password", password))));
    }
}
