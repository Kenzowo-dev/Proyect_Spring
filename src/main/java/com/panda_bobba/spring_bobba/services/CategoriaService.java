package com.panda_bobba.spring_bobba.services;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.panda_bobba.spring_bobba.model.Categoria;
import com.panda_bobba.spring_bobba.repositories.CategoriaRepository;

@Service
public class CategoriaService {

    @Autowired
    private CategoriaRepository categoriaRepository;

    public List<String> obtenerNombres() {
        return categoriaRepository.findAll()
                .stream()
                .map(Categoria::getNombre)
                .toList();
    }
}
