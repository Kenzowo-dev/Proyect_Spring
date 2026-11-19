package com.panda_bobba.spring_bobba.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class AngularCatalogController {
    @GetMapping("/gestion-catalogo")
    public String entrada() {
        return "redirect:/gestion-catalogo/";
    }

    @GetMapping({
        "/gestion-catalogo/",
        "/gestion-catalogo/acceso",
        "/gestion-catalogo/productos",
        "/gestion-catalogo/productos/nuevo",
        "/gestion-catalogo/productos/{id:[0-9]+}",
        "/gestion-catalogo/productos/{id:[0-9]+}/editar",
        "/gestion-catalogo/sin-permiso"
    })
    public String catalogo() {
        return "forward:/gestion-catalogo/index.html";
    }
}
