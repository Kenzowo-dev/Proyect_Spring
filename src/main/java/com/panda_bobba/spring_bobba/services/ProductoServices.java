package com.panda_bobba.spring_bobba.services;

import java.util.List;
import java.util.Optional;

import com.panda_bobba.spring_bobba.model.ProductoJPA;

public interface ProductoServices {

    List<ProductoJPA> findByCategoryJPA(String categoryJPA);

    ProductoJPA findTopByCategoryJPAOrderByPriceJPADesc(String categoryJPA);

    
    List<ProductoJPA> findAll();

    Optional<ProductoJPA> findById(Long id);

    ProductoJPA save(ProductoJPA producto);

    void deleteById(Long id);

}
