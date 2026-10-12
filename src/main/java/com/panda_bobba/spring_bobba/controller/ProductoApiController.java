package com.panda_bobba.spring_bobba.controller;

import java.net.URI;
import java.util.List;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.panda_bobba.spring_bobba.services.ProductoApiService;
import com.panda_bobba.spring_bobba.services.ProductoApiService.*;

@RestController
@RequestMapping("/api/productos")
public class ProductoApiController {
    private final ProductoApiService service;
    public ProductoApiController(ProductoApiService service) { this.service = service; }
    @GetMapping
    public List<Vista> listar(@RequestParam(required=false) String categoria, @RequestParam(required=false) String texto,
        @RequestParam(required=false) Double minimo, @RequestParam(required=false) Double maximo) {
        return service.buscar(categoria, texto, minimo, maximo);
    }
    @GetMapping("/{id}") public Vista obtener(@PathVariable Long id) { return service.obtener(id); }
    @PostMapping public ResponseEntity<Vista> crear(@Valid @RequestBody Datos datos) {
        var p = service.crear(datos); return ResponseEntity.created(URI.create("/api/productos/"+p.id())).body(p);
    }
    @PutMapping("/{id}") public Vista actualizar(@PathVariable Long id, @Valid @RequestBody Datos datos) { return service.actualizar(id,datos); }
    @DeleteMapping("/{id}") public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        service.eliminar(id); return ResponseEntity.noContent().build();
    }
    @PatchMapping("/precios") public List<Vista> precios(@Valid @RequestBody Lote lote) { return service.precios(lote); }
}
