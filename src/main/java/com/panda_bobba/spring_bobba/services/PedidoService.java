package com.panda_bobba.spring_bobba.services;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.panda_bobba.spring_bobba.model.Pedido;
import com.panda_bobba.spring_bobba.model.Pedido.Estado;
import com.panda_bobba.spring_bobba.model.PedidoItem;
import com.panda_bobba.spring_bobba.model.ProductoJPA;
import com.panda_bobba.spring_bobba.repositories.PedidoRepository;
import com.panda_bobba.spring_bobba.repositories.ProductoRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PedidoService {
    private final PedidoRepository pedidos;
    private final ProductoRepository productos;
    private final TransactionTemplate transaccion;

    public PedidoService(PedidoRepository pedidos, ProductoRepository productos, PlatformTransactionManager gestor) {
        this.pedidos = pedidos;
        this.productos = productos;
        this.transaccion = new TransactionTemplate(gestor);
    }

    public record Solicitud(
        @NotNull UUID solicitudId,
        @NotBlank(message = "Ingresa el nombre de quien recogerá el pedido")
        @Size(max = 100, message = "Usa como máximo 100 caracteres") String nombre,
        @NotBlank(message = "Ingresa un teléfono de contacto")
        @Size(max = 25, message = "Usa como máximo 25 caracteres")
        @Pattern(regexp = "(?=(?:\\D*[0-9]){7,15}\\D*$)\\+?[0-9()\\p{Zs}-]+",
            message = "Ingresa un número de teléfono válido de 7 a 15 dígitos") String telefono,
        @NotEmpty(message = "Agrega productos a tu pedido")
        @Size(max = 50, message = "Puedes pedir hasta 50 productos distintos") List<@NotNull @Valid Seleccion> items
    ) {}

    public record Seleccion(
        @NotNull @Positive Long productoId,
        @NotNull @Min(1) @Max(99) Integer cantidad,
        @NotNull @PositiveOrZero @Digits(integer = 17, fraction = 2) BigDecimal precioUnitario
    ) {}

    public record CambioEstado(@NotNull Estado estado) {}

    public record VistaItem(Long productoId, String nombre, int cantidad, BigDecimal precioUnitario, BigDecimal subtotal) {
        static VistaItem de(PedidoItem item) {
            return new VistaItem(item.getProductoId(), item.getNombre(), item.getCantidad(), item.getPrecioUnitario(), item.subtotal());
        }
    }

    public record Vista(Long id, String nombre, String telefono, BigDecimal total, Estado estado, Instant creadoEn,
                        List<VistaItem> items) {
        static Vista de(Pedido pedido) {
            return new Vista(pedido.getId(), pedido.getNombre(), pedido.getTelefono(), pedido.getTotal(), pedido.getEstado(),
                pedido.getCreadoEn(), pedido.getItems().stream().map(VistaItem::de).toList());
        }
    }

    public record Resultado(Vista pedido, boolean nuevo) {}

    public Resultado crear(String usuario, Solicitud solicitud) {
        var ids = solicitud.items().stream().map(Seleccion::productoId).distinct().toList();
        if (ids.size() != solicitud.items().size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cada producto debe aparecer una sola vez en el pedido.");
        }
        try {
            return transaccion.execute(status -> pedidos.findBySolicitudId(solicitud.solicitudId())
                .map(pedido -> verificarReintento(pedido, usuario, solicitud))
                .orElseGet(() -> guardar(usuario, solicitud, ids)));
        } catch (DataIntegrityViolationException exception) {
            // Una segunda solicitud con el mismo identificador puede llegar antes de que termine la primera.
            return pedidos.findBySolicitudId(solicitud.solicitudId())
                .map(pedido -> verificarReintento(pedido, usuario, solicitud))
                .orElseThrow(() -> exception);
        }
    }

    private Resultado guardar(String usuario, Solicitud solicitud, List<Long> ids) {
        var catalogo = productos.findAllById(ids).stream()
            .collect(Collectors.toMap(ProductoJPA::getIdJPA, Function.identity()));
        var items = solicitud.items().stream().map(seleccion -> crearItem(seleccion, catalogo)).toList();
        var pedido = new Pedido(solicitud.solicitudId(), usuario, solicitud.nombre().strip(), solicitud.telefono().strip(), items);
        return new Resultado(Vista.de(pedidos.saveAndFlush(pedido)), true);
    }

    private PedidoItem crearItem(Seleccion seleccion, Map<Long, ProductoJPA> catalogo) {
        var producto = catalogo.get(seleccion.productoId());
        if (producto == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Una bebida de tu pedido ya no está disponible. Revisa tu carrito.");
        }
        var precio = producto.getPrecioMoneda();
        if (precio.compareTo(seleccion.precioUnitario()) != 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "El precio de " + producto.getNameJPA() + " cambió. Revisa tu carrito.");
        }
        return new PedidoItem(producto, seleccion.cantidad(), precio);
    }

    private Resultado verificarReintento(Pedido pedido, String usuario, Solicitud solicitud) {
        if (!usuario.equals(pedido.getUsuario())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Este identificador de pedido ya está en uso.");
        }
        var seleccion = solicitud.items().stream().collect(Collectors.toMap(Seleccion::productoId, Function.identity()));
        var items = pedido.getItems();
        if (!pedido.getNombre().equals(solicitud.nombre().strip())
                || !pedido.getTelefono().equals(solicitud.telefono().strip())
                || items.size() != seleccion.size()
                || !items.stream().allMatch(item -> coincide(item, seleccion.get(item.getProductoId())))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Este intento ya registró un pedido con otros datos.");
        }
        return new Resultado(Vista.de(pedido), false);
    }

    private boolean coincide(PedidoItem item, Seleccion seleccion) {
        return seleccion != null && item.getCantidad() == seleccion.cantidad()
            && item.getPrecioUnitario().compareTo(seleccion.precioUnitario()) == 0;
    }

    @Transactional(readOnly = true)
    public List<Vista> listar() {
        return pedidos.findAllByOrderByCreadoEnDescIdDesc().stream().map(Vista::de).toList();
    }

    @Transactional
    public Vista actualizarEstado(Long id, Estado estado) {
        if (estado == Estado.RECIBIDO) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Elige si el pedido fue entregado o cancelado.");
        }
        var pedido = pedidos.findOneById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "El pedido no existe."));
        if (pedido.getEstado() != Estado.RECIBIDO && pedido.getEstado() != estado) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El pedido ya fue entregado o cancelado.");
        }
        pedido.cambiarEstado(estado);
        return Vista.de(pedido);
    }
}
