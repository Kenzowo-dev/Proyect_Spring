package com.panda_bobba.spring_bobba.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class ProductoController {

    @GetMapping("/productos")
    public String carta() {
        return "redirect:/gestion-catalogo/carta";
    }
}
