package com.panda_bobba.spring_bobba.controller;

import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import com.panda_bobba.spring_bobba.model.ProductoJPA;
import com.panda_bobba.spring_bobba.services.CategoriaService;
import com.panda_bobba.spring_bobba.services.ProductoServices;

@Controller
@RequestMapping("/")
public class InicioController {

    @Autowired
    private ProductoServices productoServices;

    @Autowired
private CategoriaService categoriaService;

@GetMapping
public String listarProductos(Model model) {
    List<String> categorias = categoriaService.obtenerNombres();
    List<ProductoJPA> productos = new ArrayList<>();

    for (String categoria : categorias) {
        ProductoJPA producto = productoServices.findTopByCategoryJPAOrderByPriceJPADesc(categoria);
        if (producto != null) productos.add(producto);
    }

    model.addAttribute("titulo", "El Arte del Sabor Japonés");
    model.addAttribute("subtitulo", "Bebidas preparadas con la delicadeza y tradición de Japón.");
    model.addAttribute("productos", productos);

    return "inicio";
}


}
