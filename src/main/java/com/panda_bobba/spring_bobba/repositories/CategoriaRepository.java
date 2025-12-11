package com.panda_bobba.spring_bobba.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import com.panda_bobba.spring_bobba.model.Categoria;

public interface CategoriaRepository extends JpaRepository<Categoria, Long> {}
