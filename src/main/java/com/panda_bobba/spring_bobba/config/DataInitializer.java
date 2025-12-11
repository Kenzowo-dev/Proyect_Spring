package com.panda_bobba.spring_bobba.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.panda_bobba.spring_bobba.model.Role;
import com.panda_bobba.spring_bobba.model.User;
import com.panda_bobba.spring_bobba.repositories.RoleRepository;
import com.panda_bobba.spring_bobba.repositories.UserRepository;

@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {

        // Crear roles si no existen
        if (roleRepository.count() == 0) {
            Role roleAdmin = new Role("ROLE_ADMIN");
            Role roleUser = new Role("ROLE_USER");

            roleRepository.save(roleAdmin);
            roleRepository.save(roleUser);
        }

        // Recuperar roles MANAGED por Hibernate
        Role roleAdmin = roleRepository.findByName("ROLE_ADMIN")
                .orElseThrow(() -> new RuntimeException("ROLE_ADMIN no encontrado"));
        Role roleUser = roleRepository.findByName("ROLE_USER")
                .orElseThrow(() -> new RuntimeException("ROLE_USER no encontrado"));

        // Crear usuario admin si no existe
        if (!userRepository.existsByUsername("admin")) {
            User admin = new User();
            admin.setUsername("admin");
            admin.setPassword(passwordEncoder.encode("admin123"));
            admin.setEnabled(true);
            admin.addRole(roleAdmin);
            userRepository.save(admin);
        }

        // Crear usuario normal si no existe
        if (!userRepository.existsByUsername("user")) {
            User user = new User();
            user.setUsername("user");
            user.setPassword(passwordEncoder.encode("user123"));
            user.setEnabled(true);
            user.addRole(roleUser);
            userRepository.save(user);
        }

        System.out.println("===========================================");
        System.out.println("Datos iniciales verificados/creados.");
        System.out.println("Admin - username: admin, password: admin123");
        System.out.println("User - username: user, password: user123");
        System.out.println("===========================================");
    }
}
