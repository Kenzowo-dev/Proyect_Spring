package com.panda_bobba.spring_bobba.controller;

import java.util.List;
import java.util.Objects;
import java.util.stream.Stream;

import com.panda_bobba.spring_bobba.model.Categoria;
import com.panda_bobba.spring_bobba.repositories.CategoriaRepository;
import com.panda_bobba.spring_bobba.repositories.ProductoRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class CategoriaApiController {
    private final CategoriaRepository categorias;
    private final ProductoRepository productos;

    public CategoriaApiController(CategoriaRepository categorias, ProductoRepository productos) {
        this.categorias = categorias;
        this.productos = productos;
    }

    @GetMapping("/api/categorias")
    public List<String> listar() {
        return Stream.concat(
                categorias.findAll().stream().map(Categoria::getNombre),
                productos.categoriasUsadas().stream())
            .filter(Objects::nonNull)
            .filter(nombre -> !nombre.isBlank())
            .distinct()
            .sorted()
            .toList();
    }
}
