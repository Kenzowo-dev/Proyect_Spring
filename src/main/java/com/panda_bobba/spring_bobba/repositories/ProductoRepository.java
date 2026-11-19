package com.panda_bobba.spring_bobba.repositories;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.panda_bobba.spring_bobba.model.ProductoJPA;

@Repository
public interface ProductoRepository extends JpaRepository<ProductoJPA, Long>, JpaSpecificationExecutor<ProductoJPA> {
    @Query("select distinct p.categoryJPA from ProductoJPA p where p.categoryJPA is not null")
    List<String> categoriasUsadas();

    ProductoJPA findTopByCategoryJPAOrderByPriceJPADesc(String categoryJPA);
    boolean existsByNameJPA(String nameJPA);
}
