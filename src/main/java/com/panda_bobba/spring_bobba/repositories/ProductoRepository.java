package com.panda_bobba.spring_bobba.repositories;

import java.util.List;

import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

import com.panda_bobba.spring_bobba.model.ProductoJPA;

@Repository
public interface ProductoRepository extends CrudRepository<ProductoJPA, Long> {
    @org.springframework.data.jpa.repository.Query("""
        select p from ProductoJPA p
        where (:categoria is null or p.categoryJPA = :categoria)
        and (:texto is null or lower(p.nameJPA) like lower(concat('%', :texto, '%')))
        and (:minimo is null or p.priceJPA >= :minimo)
        and (:maximo is null or p.priceJPA <= :maximo)
        order by p.nameJPA
        """)
    List<ProductoJPA> buscar(
        @org.springframework.data.repository.query.Param("categoria") String categoria,
        @org.springframework.data.repository.query.Param("texto") String texto,
        @org.springframework.data.repository.query.Param("minimo") Double minimo,
        @org.springframework.data.repository.query.Param("maximo") Double maximo);
    List<ProductoJPA> findByCategoryJPA(String categoryJPA);
    ProductoJPA findTopByCategoryJPAOrderByPriceJPADesc(String categoryJPA);
    boolean existsByNameJPA(String nameJPA);
}
