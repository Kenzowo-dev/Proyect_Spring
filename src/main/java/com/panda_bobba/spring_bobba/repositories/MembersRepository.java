package com.panda_bobba.spring_bobba.repositories;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.panda_bobba.spring_bobba.model.MembersJPA;

public interface MembersRepository extends JpaRepository<MembersJPA, Long> {
    Optional<MembersJPA> findByName(String name);
}
