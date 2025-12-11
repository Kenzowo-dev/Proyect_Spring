package com.panda_bobba.spring_bobba.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import com.panda_bobba.spring_bobba.DTO.MemberChargeDTO;
import com.panda_bobba.spring_bobba.services.Members_chargesServices;

@Controller
public class NosotrosController {
    @Autowired
    private Members_chargesServices membersChargesServices;

    @GetMapping("/nosotros")
    public String mostrarMiembrosYCargos(Model model) {
        List<MemberChargeDTO> lista = membersChargesServices.fetchMembersCharges();
        model.addAttribute("lista", lista);
        model.addAttribute("titulo", "Sobre Nosotros");
        model.addAttribute("descripcion", "Conoce la historia detrás de Panda Bobba.");
        return "nosotros"; 
    }
}
