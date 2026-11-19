package com.panda_bobba.spring_bobba.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class AngularController {
    @GetMapping({"/app", "/app/"})
    public String catalogo() {
        return "redirect:/app/index.html";
    }
}
