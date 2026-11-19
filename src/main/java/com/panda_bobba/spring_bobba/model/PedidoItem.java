package com.panda_bobba.spring_bobba.model;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public class PedidoItem {
    @Column(name = "producto_id", nullable = false)
    private Long productoId;

    @Column(nullable = false, length = 100)
    private String nombre;

    @Column(nullable = false)
    private int cantidad;

    @Column(name = "precio_unitario", nullable = false, precision = 19, scale = 2)
    private BigDecimal precioUnitario;

    protected PedidoItem() {}

    public PedidoItem(ProductoJPA producto, int cantidad, BigDecimal precioUnitario) {
        this.productoId = producto.getIdJPA();
        this.nombre = producto.getNameJPA();
        this.cantidad = cantidad;
        this.precioUnitario = precioUnitario;
    }

    public Long getProductoId() { return productoId; }
    public String getNombre() { return nombre; }
    public int getCantidad() { return cantidad; }
    public BigDecimal getPrecioUnitario() { return precioUnitario; }

    public BigDecimal subtotal() {
        return precioUnitario.multiply(BigDecimal.valueOf(cantidad));
    }
}
