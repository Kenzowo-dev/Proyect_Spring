package com.panda_bobba.spring_bobba.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import com.panda_bobba.spring_bobba.model.ProductoJPA;
import com.panda_bobba.spring_bobba.services.ProductoServices;

@Controller
@RequestMapping("/productos")
public class ProductoController {

    @Autowired
    private ProductoServices productoServices;

    @GetMapping
    public String listarProductos(Model model) {
        model.addAttribute("titulo", "Nuestros Productos");
        model.addAttribute("subtitulo", "Descubre nuestra selección de bebidas artesanales");

        List<ProductoJPA> calientes = productoServices.findByCategoryJPA("Caliente");
        List<ProductoJPA> frios = productoServices.findByCategoryJPA("Frío");
        List<ProductoJPA> bubbleTea = productoServices.findByCategoryJPA("Bubble Tea");

        model.addAttribute("calientes", calientes);
        model.addAttribute("productosFrios", frios);
        model.addAttribute("bubbleTea", bubbleTea);

        return "productos"; 
    }
}
