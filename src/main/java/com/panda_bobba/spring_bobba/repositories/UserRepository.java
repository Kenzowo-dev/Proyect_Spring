package com.panda_bobba.spring_bobba.repositories;

import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

import com.panda_bobba.spring_bobba.model.User;

import java.util.Optional;


@Repository
public interface UserRepository extends CrudRepository<User, Long> {
    Optional<User> findByUsername(String username);  // <-- usar Optional
    boolean existsByUsername(String username);
}
