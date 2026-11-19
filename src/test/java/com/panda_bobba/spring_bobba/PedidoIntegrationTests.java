package com.panda_bobba.spring_bobba;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.panda_bobba.spring_bobba.model.Pedido;
import com.panda_bobba.spring_bobba.model.PedidoItem;
import com.panda_bobba.spring_bobba.model.ProductoJPA;
import com.panda_bobba.spring_bobba.repositories.PedidoRepository;
import com.panda_bobba.spring_bobba.repositories.ProductoRepository;
import com.panda_bobba.spring_bobba.repositories.UserRepository;
import com.panda_bobba.spring_bobba.services.PedidoService;
import com.panda_bobba.spring_bobba.services.PedidoService.Seleccion;
import com.panda_bobba.spring_bobba.services.PedidoService.Solicitud;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PedidoIntegrationTests {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired ProductoRepository productos;
    @Autowired PedidoRepository pedidos;
    @Autowired UserRepository cuentas;
    @Autowired PedidoService servicio;

    private final List<Long> productosCreados = new ArrayList<>();
    private final List<UUID> solicitudesCreadas = new ArrayList<>();
    private final List<String> cuentasCreadas = new ArrayList<>();

    @AfterEach
    void limpiar() {
        solicitudesCreadas.forEach(solicitud -> pedidos.findBySolicitudId(solicitud)
            .ifPresent(pedido -> pedidos.deleteById(pedido.getId())));
        productosCreados.forEach(productos::deleteById);
        cuentasCreadas.forEach(cuenta -> cuentas.findByUsername(cuenta)
            .ifPresent(usuario -> cuentas.deleteById(usuario.getId())));
    }

    @Test
    void cartaYPanelEncuentranProductosGuardadosConCategoriasAnteriores() throws Exception {
        var producto = crearProducto("Espuma % de temporada", "Especiales", 8.125);
        var admin = autenticar("admin");
        mvc.perform(get("/api/carta"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.id == " + producto.getIdJPA() + ")].categoria", hasItem("Especiales")));
        mvc.perform(get("/api/carta/{id}", producto.getIdJPA()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.nombre").value(producto.getNameJPA()))
            .andExpect(jsonPath("$.precio").value(8.13));
        mvc.perform(get("/api/carta/{id}", Long.MAX_VALUE)).andExpect(status().isNotFound());
        mvc.perform(get("/api/productos").header("Authorization", admin))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.id == " + producto.getIdJPA() + ")].precio", hasItem(8.125)));
        mvc.perform(get("/api/productos").param("texto", "ESPUMA %").header("Authorization", admin))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].id").value(producto.getIdJPA()));
        mvc.perform(get("/api/categorias").header("Authorization", admin))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasItem("Especiales")));
    }

    @Test
    void registraPedidoConPreciosVigentesYPersisteSuDetalleAunqueCambieElCatalogo() throws Exception {
        var bebida = crearProducto("Granizado", "Frío", 6.25);
        var seleccion = new Seleccion(bebida.getIdJPA(), 3, new BigDecimal("6.25"));
        var orden = solicitud(List.of(seleccion));
        var body = json.writeValueAsString(orden);
        mvc.perform(post("/api/pedidos").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isUnauthorized());
        var cuenta = "cliente-recojo";
        var token = registrar(cuenta);
        var respuesta = mvc.perform(post("/api/pedidos").header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.total").value(18.75))
            .andExpect(jsonPath("$.estado").value("RECIBIDO"))
            .andExpect(jsonPath("$.items[0].nombre").value("Granizado"))
            .andExpect(jsonPath("$.items[0].subtotal").value(18.75))
            .andReturn().getResponse();
        var datos = json.readTree(respuesta.getContentAsString());
        var id = datos.get("id").longValue();
        assertThat(Instant.parse(datos.get("creadoEn").asText())).isBeforeOrEqualTo(Instant.now());
        assertThat(pedidos.findById(id).orElseThrow().getUsuario()).isEqualTo(cuenta);

        bebida.setPriceJPA(7.50);
        bebida.setNameJPA("Granizado especial");
        productos.save(bebida);
        mvc.perform(post("/api/pedidos").header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(solicitud(List.of(seleccion)))))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.message").value("El precio de Granizado especial cambió. Revisa tu carrito."));

        productos.deleteById(bebida.getIdJPA());
        mvc.perform(post("/api/pedidos").header("Authorization", token).contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(id))
            .andExpect(jsonPath("$.items[0].precioUnitario").value(6.25));
        var distinto = new Solicitud(orden.solicitudId(), "Otra persona", orden.telefono(), orden.items());
        mvc.perform(post("/api/pedidos").header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(distinto)))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.id").doesNotExist());

        var usuario = autenticar("user");
        mvc.perform(post("/api/pedidos").header("Authorization", usuario).contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.id").doesNotExist())
            .andExpect(jsonPath("$.telefono").doesNotExist());
        mvc.perform(get("/api/pedidos")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/pedidos").header("Authorization", usuario)).andExpect(status().isForbidden());
        mvc.perform(patch("/api/pedidos/{id}", id).header("Authorization", usuario)
            .contentType(MediaType.APPLICATION_JSON).content("{\"estado\":\"ENTREGADO\"}")).andExpect(status().isForbidden());

        var admin = autenticar("admin");
        mvc.perform(get("/api/pedidos").header("Authorization", admin))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].id").value(id))
            .andExpect(jsonPath("$[0].items[0].nombre").value("Granizado"));
        for (int intento = 0; intento < 2; intento++) {
            mvc.perform(patch("/api/pedidos/{id}", id).header("Authorization", admin)
                    .contentType(MediaType.APPLICATION_JSON).content("{\"estado\":\"ENTREGADO\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.estado").value("ENTREGADO"));
        }
        mvc.perform(patch("/api/pedidos/{id}", id).header("Authorization", admin)
                .contentType(MediaType.APPLICATION_JSON).content("{\"estado\":\"CANCELADO\"}"))
            .andExpect(status().isConflict());
        assertThat(pedidos.findById(id).orElseThrow().getEstado().name()).isEqualTo("ENTREGADO");
    }

    @Test
    void rechazaCantidadesFraccionariasDuplicadosYProductosEliminados() throws Exception {
        var bebida = crearProducto("Té", "Caliente", 5.0);
        var seleccion = new Seleccion(bebida.getIdJPA(), 1, new BigDecimal("5.00"));
        var token = autenticar("user");
        var cantidadFraccionaria = Map.of("solicitudId", UUID.randomUUID(), "nombre", "Cliente",
            "telefono", "987654321", "items", List.of(Map.of("productoId", bebida.getIdJPA(), "cantidad", 1.5, "precioUnitario", 5)));
        mvc.perform(post("/api/pedidos").header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(cantidadFraccionaria)))
            .andExpect(status().isBadRequest());

        var duplicado = solicitud(List.of(seleccion, seleccion));
        mvc.perform(post("/api/pedidos").header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(duplicado)))
            .andExpect(status().isBadRequest());
        assertThat(pedidos.findBySolicitudId(duplicado.solicitudId())).isEmpty();

        var noDisponible = solicitud(List.of(seleccion, new Seleccion(Long.MAX_VALUE, 1, new BigDecimal("5.00"))));
        mvc.perform(post("/api/pedidos").header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(noDisponible)))
            .andExpect(status().isConflict());
        assertThat(pedidos.findBySolicitudId(noDisponible.solicitudId())).isEmpty();
    }

    @Test
    void administradorConservaPedidosAnterioresPeroElClienteNoPuedeReclamarlos() throws Exception {
        var bebida = crearProducto("Café anterior", "Caliente", 5.00);
        var precio = new BigDecimal("5.00");
        var solicitud = solicitud(List.of(new Seleccion(bebida.getIdJPA(), 1, precio)));
        var pedido = pedidos.save(new Pedido(solicitud.solicitudId(), null, solicitud.nombre(), solicitud.telefono(),
            List.of(new PedidoItem(bebida, 1, precio))));

        mvc.perform(get("/api/pedidos").header("Authorization", autenticar("admin")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.id == " + pedido.getId() + ")].nombre", hasItem(solicitud.nombre())));
        mvc.perform(post("/api/pedidos").header("Authorization", autenticar("user"))
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(solicitud)))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.id").doesNotExist());
    }

    @Test
    void solicitudesConcurrentesConElMismoIdentificadorCreanUnSoloPedido() throws Exception {
        var bebida = crearProducto("Café", "Caliente", 5.00);
        var orden = solicitud(List.of(new Seleccion(bebida.getIdJPA(), 1, new BigDecimal("5.00"))));
        var inicio = new CyclicBarrier(2);
        var hilos = Executors.newFixedThreadPool(2);
        try {
            var primero = hilos.submit(() -> {
                inicio.await(10, TimeUnit.SECONDS);
                return servicio.crear("user", orden);
            });
            var segundo = hilos.submit(() -> {
                inicio.await(10, TimeUnit.SECONDS);
                return servicio.crear("user", orden);
            });
            var resultado1 = primero.get(15, TimeUnit.SECONDS);
            var resultado2 = segundo.get(15, TimeUnit.SECONDS);
            assertThat(resultado1.pedido().id()).isEqualTo(resultado2.pedido().id());
            assertThat(List.of(resultado1.nuevo(), resultado2.nuevo())).containsExactlyInAnyOrder(true, false);
        } finally {
            hilos.shutdownNow();
        }
    }

    private ProductoJPA crearProducto(String nombre, String categoria, double precio) {
        var producto = new ProductoJPA();
        producto.setNameJPA(nombre);
        producto.setDescriptionJPA("Una bebida de prueba.");
        producto.setCategoryJPA(categoria);
        producto.setPriceJPA(precio);
        producto.setImageURLJPA("/images/oreo.jpg");
        var guardado = productos.save(producto);
        productosCreados.add(guardado.getIdJPA());
        return guardado;
    }

    private Solicitud solicitud(List<Seleccion> items) {
        var id = UUID.randomUUID();
        solicitudesCreadas.add(id);
        return new Solicitud(id, "Cliente de prueba", "+51 987 654 321", items);
    }

    private String autenticar(String usuario) throws Exception {
        var respuesta = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("username", usuario, "password", usuario + "12345678"))))
            .andExpect(status().isOk()).andReturn().getResponse();
        return "Bearer " + json.readTree(respuesta.getContentAsString()).get("accessToken").asText();
    }

    private String registrar(String usuario) throws Exception {
        cuentasCreadas.add(usuario);
        var respuesta = mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("username", usuario, "password", "recojoSeguro123"))))
            .andExpect(status().isCreated()).andReturn().getResponse();
        return "Bearer " + json.readTree(respuesta.getContentAsString()).get("accessToken").asText();
    }
}
