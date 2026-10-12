package com.panda_bobba.spring_bobba.controller;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
@Controller
public class GestionController {
    @GetMapping("/panel") public String panel() { return "gestion"; }
    @GetMapping("/gestion") public String gestion() { return "redirect:/panel"; }
}
