package com.panda_bobba.spring_bobba.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class GestionController {
    private final Resource catalogoAngular;

    public GestionController(@Value("classpath:/static/gestion-catalogo/index.html") Resource catalogoAngular) {
        this.catalogoAngular = catalogoAngular;
    }

    @GetMapping("/panel")
    public String panel(Model modelo) {
        modelo.addAttribute("catalogoAngularDisponible", catalogoAngular.exists());
        return "gestion";
    }

    @GetMapping("/gestion")
    public String gestion() {
        return "redirect:/panel";
    }
}
