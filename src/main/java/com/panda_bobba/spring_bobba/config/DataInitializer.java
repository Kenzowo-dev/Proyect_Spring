package com.panda_bobba.spring_bobba.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.panda_bobba.spring_bobba.model.Role;
import com.panda_bobba.spring_bobba.model.User;
import com.panda_bobba.spring_bobba.model.Categoria;
import com.panda_bobba.spring_bobba.model.ChargesJPA;
import com.panda_bobba.spring_bobba.model.MembersChargesId;
import com.panda_bobba.spring_bobba.model.MembersJPA;
import com.panda_bobba.spring_bobba.model.Members_charges;
import com.panda_bobba.spring_bobba.model.ProductoJPA;
import com.panda_bobba.spring_bobba.repositories.CategoriaRepository;
import com.panda_bobba.spring_bobba.repositories.ChargesRepository;
import com.panda_bobba.spring_bobba.repositories.MembersRepository;
import com.panda_bobba.spring_bobba.repositories.Members_chargesRepository;
import com.panda_bobba.spring_bobba.repositories.ProductoRepository;
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

    @Autowired
    private CategoriaRepository categoriaRepository;

    @Autowired
    private ProductoRepository productoRepository;

    @Autowired
    private MembersRepository membersRepository;

    @Autowired
    private ChargesRepository chargesRepository;

    @Autowired
    private Members_chargesRepository membersChargesRepository;

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

        crearCategoriaSiNoExiste("Caliente");
        crearCategoriaSiNoExiste("Frío");
        crearCategoriaSiNoExiste("Bubble Tea");

        crearProductoSiNoExiste(
                "Latte Cremoso",
                "Café suave, leche sedosa y acabado limpio.",
                "/images/cafelate.webp",
                9.00,
                "Caliente");
        crearProductoSiNoExiste(
                "Matcha Latte",
                "Té verde con textura cremosa y sabor equilibrado.",
                "/images/macha.jpg",
                10.00,
                "Caliente");
        crearProductoSiNoExiste(
                "Iced Matcha",
                "Fresco, ligero y balanceado para cualquier momento.",
                "/images/macha.jpg",
                10.00,
                "Frío");
        crearProductoSiNoExiste(
                "Cold Latte",
                "Café frío con cuerpo ligero y dulzor bien medido.",
                "/images/cafelate.webp",
                9.00,
                "Frío");
        crearProductoSiNoExiste(
                "Oreo Bobba",
                "Cremoso, intenso y con perlas en su punto.",
                "/images/oreo.jpg",
                12.00,
                "Bubble Tea");
        crearProductoSiNoExiste(
                "Matcha Bobba",
                "Té verde, leche suave y perlas con buena textura.",
                "/images/macha.jpg",
                12.00,
                "Bubble Tea");

        crearMiembroCargoSiNoExiste(
                "Equipo de baristas",
                "Preparación artesanal",
                "Cuidamos cada receta con orden, limpieza y consistencia.");
        crearMiembroCargoSiNoExiste(
                "Equipo de atención",
                "Experiencia del cliente",
                "Acompañamos cada visita con un servicio claro, amable y confiable.");

        System.out.println("===========================================");
        System.out.println("Datos iniciales verificados/creados.");
        System.out.println("Admin - username: admin, password: admin123");
        System.out.println("User - username: user, password: user123");
        System.out.println("===========================================");
    }

    private void crearCategoriaSiNoExiste(String nombre) {
        if (!categoriaRepository.existsByNombre(nombre)) {
            categoriaRepository.save(new Categoria(nombre));
        }
    }

    private void crearProductoSiNoExiste(String nombre, String descripcion, String imagen, double precio, String categoria) {
        if (!productoRepository.existsByNameJPA(nombre)) {
            ProductoJPA producto = new ProductoJPA();
            producto.setNameJPA(nombre);
            producto.setDescriptionJPA(descripcion);
            producto.setImageURLJPA(imagen);
            producto.setPriceJPA(precio);
            producto.setCategoryJPA(categoria);
            productoRepository.save(producto);
        }
    }

    private void crearMiembroCargoSiNoExiste(String nombreMiembro, String nombreCargo, String descripcionCargo) {
        MembersJPA miembro = membersRepository.findByName(nombreMiembro)
                .orElseGet(() -> {
                    MembersJPA nuevoMiembro = new MembersJPA();
                    nuevoMiembro.setName(nombreMiembro);
                    return membersRepository.save(nuevoMiembro);
                });

        ChargesJPA cargo = chargesRepository.findByName(nombreCargo)
                .orElseGet(() -> {
                    ChargesJPA nuevoCargo = new ChargesJPA();
                    nuevoCargo.setName(nombreCargo);
                    nuevoCargo.setDescription(descripcionCargo);
                    return chargesRepository.save(nuevoCargo);
                });

        MembersChargesId id = new MembersChargesId(miembro.getId(), cargo.getId());
        if (!membersChargesRepository.existsById(id)) {
            Members_charges relacion = new Members_charges();
            relacion.setId(id);
            relacion.setMember(miembro);
            relacion.setCharge(cargo);
            membersChargesRepository.save(relacion);
        }
    }
}
