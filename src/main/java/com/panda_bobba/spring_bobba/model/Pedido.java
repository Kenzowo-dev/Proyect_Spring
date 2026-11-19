package com.panda_bobba.spring_bobba.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;

@Entity
@Table(name = "pedidos")
public class Pedido {
    public enum Estado { RECIBIDO, ENTREGADO, CANCELADO }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "solicitud_id", nullable = false, unique = true)
    private UUID solicitudId;

    // Los pedidos anteriores al registro de cuentas siguen disponibles con usuario nulo.
    @Column(length = 50, updatable = false)
    private String usuario;

    @Column(nullable = false, length = 100)
    private String nombre;

    @Column(nullable = false, length = 25)
    private String telefono;

    @Column(nullable = false, precision = 23, scale = 2)
    private BigDecimal total;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private Estado estado;

    @Column(name = "creado_en", nullable = false)
    private Instant creadoEn;

    @ElementCollection
    @CollectionTable(name = "pedido_items", joinColumns = @JoinColumn(name = "pedido_id"))
    @OrderColumn(name = "posicion")
    private List<PedidoItem> items = new ArrayList<>();

    protected Pedido() {}

    public Pedido(UUID solicitudId, String usuario, String nombre, String telefono, List<PedidoItem> items) {
        this.solicitudId = solicitudId;
        this.usuario = usuario;
        this.nombre = nombre;
        this.telefono = telefono;
        this.total = items.stream().map(PedidoItem::subtotal).reduce(BigDecimal.ZERO, BigDecimal::add);
        this.estado = Estado.RECIBIDO;
        this.creadoEn = Instant.now();
        this.items.addAll(items);
    }

    public Long getId() { return id; }
    public String getUsuario() { return usuario; }
    public String getNombre() { return nombre; }
    public String getTelefono() { return telefono; }
    public BigDecimal getTotal() { return total; }
    public Estado getEstado() { return estado; }
    public Instant getCreadoEn() { return creadoEn; }
    public List<PedidoItem> getItems() { return List.copyOf(items); }

    public void cambiarEstado(Estado estado) {
        this.estado = estado;
    }
}
