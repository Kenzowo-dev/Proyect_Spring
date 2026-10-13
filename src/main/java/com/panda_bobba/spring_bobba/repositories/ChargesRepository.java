package com.panda_bobba.spring_bobba.repositories;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.panda_bobba.spring_bobba.model.ChargesJPA;

public interface ChargesRepository extends JpaRepository<ChargesJPA, Long> {
    Optional<ChargesJPA> findByName(String name);
}
