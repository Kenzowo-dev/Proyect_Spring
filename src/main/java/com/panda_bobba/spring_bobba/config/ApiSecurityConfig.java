package com.panda_bobba.spring_bobba.config;

import java.io.IOException;
import java.security.KeyPair;
import com.panda_bobba.spring_bobba.services.BrowserSessions;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPublicKey;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.server.resource.BearerTokenErrors;
import org.springframework.security.oauth2.server.resource.web.BearerTokenAuthenticationEntryPoint;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.server.resource.authentication.*;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class ApiSecurityConfig {
    @Bean
    KeyPair jwtKeys() throws Exception {
        var generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        return generator.generateKeyPair();
    }

    @Bean
    JwtEncoder jwtEncoder(KeyPair jwtKeys) {
        var key = new RSAKey.Builder((RSAPublicKey) jwtKeys.getPublic())
            .privateKey(jwtKeys.getPrivate()).keyID("panda-bobba").build();
        return new NimbusJwtEncoder(new ImmutableJWKSet<>(new JWKSet(key)));
    }

    @Bean
    JwtDecoder jwtDecoder(KeyPair jwtKeys) {
        var decoder = NimbusJwtDecoder.withPublicKey((RSAPublicKey) jwtKeys.getPublic()).build();
        decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer("panda-bobba"));
        return decoder;
    }

    @Bean
    AuthenticationManager apiAuthenticationManager(UserDetailsService users, PasswordEncoder passwords) {
        var provider = new DaoAuthenticationProvider(users);
        provider.setPasswordEncoder(passwords);
        return new ProviderManager(provider);
    }

    @Bean
    @Order(1)
    SecurityFilterChain browserSessionSecurity(HttpSecurity http) throws Exception {
        return http.securityMatcher("/api/session/**")
                .requestCache(cache -> cache.disable())
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
                .build();
    }

    @Bean
    @Order(2)
    SecurityFilterChain apiSecurity(HttpSecurity http, BrowserSessions sessions) throws Exception {
        var authorities = new JwtGrantedAuthoritiesConverter();
        authorities.setAuthoritiesClaimName("roles");
        authorities.setAuthorityPrefix("");
        var converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(authorities);
        http.securityMatcher("/api/**")
            .csrf(csrf -> csrf.disable())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(a -> a
                .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/productos", "/api/productos/*", "/api/auth/me")
                    .hasAnyRole("USER", "ADMIN")
                .requestMatchers("/api/productos/**").hasRole("ADMIN")
                .anyRequest().denyAll())
            .oauth2ResourceServer(o -> o.jwt(j -> j.jwtAuthenticationConverter(converter)))
            .addFilterAfter(browserSessionFilter(sessions), BearerTokenAuthenticationFilter.class);
        return http.build();
    }

    private OncePerRequestFilter browserSessionFilter(BrowserSessions sessions) {
        var entryPoint = new BearerTokenAuthenticationEntryPoint();
        return new OncePerRequestFilter() {
            @Override
            protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
                    throws ServletException, IOException {
                if (SecurityContextHolder.getContext().getAuthentication() instanceof JwtAuthenticationToken auth) {
                    var binding = auth.getToken().getClaimAsString("browserSession");
                    if (binding != null) {
                        var session = sessions.current(request);
                        if (session == null || !binding.equals(session.binding())) {
                            SecurityContextHolder.clearContext();
                            entryPoint.commence(request, response, new OAuth2AuthenticationException(
                                    BearerTokenErrors.invalidToken("La sesión de navegador ya no es válida")));
                            return;
                        }
                    }
                }
                chain.doFilter(request, response);
            }
        };
    }
}
