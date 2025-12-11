package com.panda_bobba.spring_bobba.repositories;

import java.util.List;

import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

import com.panda_bobba.spring_bobba.model.ProductoJPA;

@Repository
public interface ProductoRepository extends CrudRepository<ProductoJPA, Long> {
    List<ProductoJPA> findByCategoryJPA(String categoryJPA);
    ProductoJPA findTopByCategoryJPAOrderByPriceJPADesc(String categoryJPA);
}
