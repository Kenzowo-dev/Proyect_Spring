package com.panda_bobba.spring_bobba.controller;

import java.util.List;

import com.panda_bobba.spring_bobba.services.PedidoService;
import com.panda_bobba.spring_bobba.services.PedidoService.CambioEstado;
import com.panda_bobba.spring_bobba.services.PedidoService.Solicitud;
import com.panda_bobba.spring_bobba.services.PedidoService.Vista;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/pedidos")
public class PedidoApiController {
    private final PedidoService pedidos;

    public PedidoApiController(PedidoService pedidos) {
        this.pedidos = pedidos;
    }

    @PostMapping
    public ResponseEntity<Vista> crear(Authentication cuenta, @Valid @RequestBody Solicitud solicitud) {
        var resultado = pedidos.crear(cuenta.getName(), solicitud);
        return ResponseEntity.status(resultado.nuevo() ? HttpStatus.CREATED : HttpStatus.OK).body(resultado.pedido());
    }

    @GetMapping
    public List<Vista> listar() {
        return pedidos.listar();
    }

    @PatchMapping("/{id}")
    public Vista actualizarEstado(@PathVariable Long id, @Valid @RequestBody CambioEstado cambio) {
        return pedidos.actualizarEstado(id, cambio.estado());
    }
}
