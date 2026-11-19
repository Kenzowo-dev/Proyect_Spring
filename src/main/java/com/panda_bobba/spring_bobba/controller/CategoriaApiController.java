package com.panda_bobba.spring_bobba.controller;

import java.util.List;

import com.panda_bobba.spring_bobba.model.Categoria;
import com.panda_bobba.spring_bobba.repositories.CategoriaRepository;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class CategoriaApiController {
    private final CategoriaRepository categorias;

    public CategoriaApiController(CategoriaRepository categorias) {
        this.categorias = categorias;
    }

    @GetMapping("/api/categorias")
    public List<String> listar() {
        return categorias.findAll(Sort.by("nombre")).stream()
            .map(Categoria::getNombre)
            .toList();
    }
}
