package com.panda_bobba.spring_bobba.controller;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import com.panda_bobba.spring_bobba.model.ProductoJPA;
import com.panda_bobba.spring_bobba.services.ProductoServices;

import jakarta.validation.Valid;

@Controller
@RequestMapping("/admin/productos")
public class AdminProductoController {

    @Autowired
    private ProductoServices productoServices;

    @GetMapping
    public String listarProductos(Model model) {
        List<ProductoJPA> productos = productoServices.findAll();
        model.addAttribute("productos", productos);
        model.addAttribute("titulo", "Gestión de Productos");
        return "admin-productos";
    }

    @GetMapping("/nuevo")
    public String mostrarFormularioNuevo(Model model) {
        ProductoJPA producto = new ProductoJPA();
        model.addAttribute("producto", producto);
        model.addAttribute("titulo", "Agregar Nuevo Producto");
        model.addAttribute("accion", "nuevo");
        return "producto-form";
    }

    @PostMapping("/nuevo")
    public String guardarNuevoProducto(@Valid ProductoJPA producto, BindingResult result, 
                                       Model model, RedirectAttributes flash) {
        if (result.hasErrors()) {
            model.addAttribute("titulo", "Agregar Nuevo Producto");
            model.addAttribute("accion", "nuevo");
            return "producto-form";
        }

        productoServices.save(producto);
        flash.addFlashAttribute("success", "Producto creado exitosamente");
        return "redirect:/admin/productos";
    }

    @GetMapping("/editar/{id}")
    public String mostrarFormularioEditar(@PathVariable Long id, Model model, RedirectAttributes flash) {
        Optional<ProductoJPA> productoOpt = productoServices.findById(id);
        
        if (!productoOpt.isPresent()) {
            flash.addFlashAttribute("error", "El producto no existe");
            return "redirect:/admin/productos";
        }

        model.addAttribute("producto", productoOpt.get());
        model.addAttribute("titulo", "Editar Producto");
        model.addAttribute("accion", "editar");
        return "producto-form";
    }

    @PostMapping("/editar/{id}")
    public String actualizarProducto(@PathVariable Long id, @Valid ProductoJPA producto, 
                                     BindingResult result, Model model, RedirectAttributes flash) {
        if (result.hasErrors()) {
            model.addAttribute("titulo", "Editar Producto");
            model.addAttribute("accion", "editar");
            return "producto-form";
        }

        producto.setIdJPA(id);
        productoServices.save(producto);
        flash.addFlashAttribute("success", "Producto actualizado exitosamente");
        return "redirect:/admin/productos";
    }

    @PostMapping("/eliminar/{id}")
    public String eliminarProducto(@PathVariable Long id, RedirectAttributes flash) {
        try {
            productoServices.deleteById(id);
            flash.addFlashAttribute("success", "Producto eliminado exitosamente");
        } catch (Exception e) {
            flash.addFlashAttribute("error", "Error al eliminar el producto");
        }
        return "redirect:/admin/productos";
    }
}
