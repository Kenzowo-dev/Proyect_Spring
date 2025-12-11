package com.panda_bobba.spring_bobba.services;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.panda_bobba.spring_bobba.model.ProductoJPA;
import com.panda_bobba.spring_bobba.repositories.ProductoRepository;

@Service
public class ProductoServicesImpl implements ProductoServices {
    @Autowired
    private ProductoRepository productoRepository;

    @Transactional(readOnly = true)
    @Override
    public List<ProductoJPA> findByCategoryJPA(String categoryJPA) {
        return productoRepository.findByCategoryJPA(categoryJPA);
    }

    @Transactional(readOnly = true)
    @Override
    public ProductoJPA findTopByCategoryJPAOrderByPriceJPADesc(String categoryJPA) {
        return productoRepository.findTopByCategoryJPAOrderByPriceJPADesc(categoryJPA);
    }

    @Transactional(readOnly = true)
    @Override
    public List<ProductoJPA> findAll() {
        return (List<ProductoJPA>) productoRepository.findAll();
    }

    @Transactional(readOnly = true)
    @Override
    public Optional<ProductoJPA> findById(Long id) {
        return productoRepository.findById(id);
    }

    @Transactional
    @Override
    public ProductoJPA save(ProductoJPA producto) {
        return productoRepository.save(producto);
    }

    @Transactional
    @Override
    public void deleteById(Long id) {
        productoRepository.deleteById(id);
    }

}