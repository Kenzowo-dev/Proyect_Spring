package com.panda_bobba.spring_bobba.repositories;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.panda_bobba.spring_bobba.model.Pedido;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

public interface PedidoRepository extends JpaRepository<Pedido, Long> {
    @EntityGraph(attributePaths = "items")
    Optional<Pedido> findBySolicitudId(UUID solicitudId);

    @EntityGraph(attributePaths = "items")
    List<Pedido> findAllByOrderByCreadoEnDescIdDesc();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Pedido> findOneById(Long id);
}
