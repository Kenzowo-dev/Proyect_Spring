package com.panda_bobba.spring_bobba.controller;

import java.util.List;

import com.panda_bobba.spring_bobba.services.ProductoApiService;
import com.panda_bobba.spring_bobba.services.ProductoApiService.Vista;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/carta")
public class CartaApiController {
    private final ProductoApiService productos;

    public CartaApiController(ProductoApiService productos) {
        this.productos = productos;
    }

    @GetMapping
    public List<Vista> listar() {
        return productos.carta();
    }

    @GetMapping("/{id}")
    public Vista detalle(@PathVariable Long id) {
        return productos.detalleCarta(id);
    }
}
