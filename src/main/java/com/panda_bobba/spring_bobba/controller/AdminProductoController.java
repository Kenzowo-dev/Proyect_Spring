package com.panda_bobba.spring_bobba.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

/** Los marcadores del panel anterior llevan a la nueva gestión del catálogo. */
@Controller
@RequestMapping("/admin/productos")
public class AdminProductoController {
    @GetMapping({"", "/**"})
    public String panelAnterior() {
        return "redirect:/panel";
    }
}
