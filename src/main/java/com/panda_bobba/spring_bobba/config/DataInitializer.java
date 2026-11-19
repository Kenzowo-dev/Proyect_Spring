package com.panda_bobba.spring_bobba.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

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

    @Value("${panda.bootstrap.admin-password}")
    private String adminPassword;

    @Value("${panda.bootstrap.user-password}")
    private String userPassword;

    @Override
    @Transactional
    public void run(String... args) {
        Role adminRole = obtenerRol("ROLE_ADMIN");
        Role userRole = obtenerRol("ROLE_USER");
        crearUsuarioSiNoExiste("admin", adminPassword, adminRole);
        crearUsuarioSiNoExiste("user", userPassword, userRole);

        // Las categorías iniciales indican que el catálogo ya fue inicializado.
        // Arrancar la aplicación no debe restaurar productos eliminados.
        boolean inicializarCatalogo = categoriaRepository.count() == 0;
        crearCategoriaSiNoExiste("Caliente");
        crearCategoriaSiNoExiste("Frío");
        crearCategoriaSiNoExiste("Bubble Tea");

        if (inicializarCatalogo) {
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
        }

        crearMiembroCargoSiNoExiste(
                "Equipo de baristas",
                "Preparación artesanal",
                "Cuidamos cada receta con orden, limpieza y consistencia.");
        crearMiembroCargoSiNoExiste(
                "Equipo de atención",
                "Experiencia del cliente",
                "Acompañamos cada visita con un servicio claro, amable y confiable.");
    }

    private Role obtenerRol(String nombre) {
        return roleRepository.findByName(nombre)
                .orElseGet(() -> roleRepository.save(new Role(nombre)));
    }

    private void crearUsuarioSiNoExiste(String nombre, String clave, Role rol) {
        if (clave == null || clave.isBlank()) {
            return;
        }
        if (clave.length() < 12) {
            throw new IllegalStateException("Bootstrap passwords must be at least 12 characters.");
        }
        if (userRepository.existsByUsername(nombre)) {
            return;
        }
        var usuario = new User(nombre, passwordEncoder.encode(clave), true);
        usuario.addRole(rol);
        userRepository.save(usuario);
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
