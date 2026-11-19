package com.panda_bobba.spring_bobba.services;

import java.util.List;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import com.panda_bobba.spring_bobba.model.ProductoJPA;
import com.panda_bobba.spring_bobba.repositories.ProductoRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(readOnly = true)
public class ProductoApiService {
    private final ProductoRepository repository;
    public ProductoApiService(ProductoRepository repository) { this.repository = repository; }
    public record Datos(@NotBlank(message="Ingresa el nombre") @Size(max=100, message="Usa máximo 100 caracteres") String nombre,
        @NotBlank(message="Ingresa la descripción") @Size(max=255, message="Usa máximo 255 caracteres") String descripcion,
        @NotBlank(message="Ingresa la categoría") @Size(max=50, message="Usa máximo 50 caracteres") String categoria,
        @NotNull(message="Ingresa el precio") @Positive(message="El precio debe ser mayor que cero") Double precio,
        @NotBlank(message="Ingresa la ruta de la imagen") @Size(max=255, message="Usa máximo 255 caracteres") @Pattern(regexp="(?:/images/|https://)[^\\s]+", message="Usa /images/ o una URL HTTPS") String imagen) {}
    public record Vista(Long id, String nombre, String descripcion, String categoria, double precio, String imagen) {
        public static Vista de(ProductoJPA p) {
            return new Vista(p.getIdJPA(), p.getNameJPA(), p.getDescriptionJPA(), p.getCategoryJPA(), p.getPriceJPA(), p.getImageURLJPA());
        }
    }
    public record Cambio(@NotNull @Positive Long id, @NotNull @Positive Double precio) {}
    public record Lote(@NotEmpty @Size(max=50) List<@NotNull @Valid Cambio> cambios) {}

    public List<Vista> buscar(String categoria, String texto, Double minimo, Double maximo) {
        if ((minimo != null && (!Double.isFinite(minimo) || minimo < 0))
            || (maximo != null && (!Double.isFinite(maximo) || maximo < 0))
            || (minimo != null && maximo != null && minimo > maximo))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rango de precios inválido");
        return repository.buscar(categoria, texto, minimo, maximo).stream().map(Vista::de).toList();
    }
    private ProductoJPA entidad(Long id) {
        return repository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Producto no encontrado"));
    }
    public Vista obtener(Long id) { return Vista.de(entidad(id)); }
    private void asignar(ProductoJPA p, Datos d) {
        p.setNameJPA(d.nombre().trim()); p.setDescriptionJPA(d.descripcion().trim());
        p.setCategoryJPA(d.categoria().trim()); p.setPriceJPA(precioFinito(d.precio())); p.setImageURLJPA(d.imagen());
    }
    @Transactional
    public Vista crear(Datos d) {
        var p = new ProductoJPA(); asignar(p,d); return Vista.de(repository.save(p));
    }
    @Transactional
    public Vista actualizar(Long id, Datos d) {
        var p = entidad(id); asignar(p,d); return Vista.de(repository.save(p));
    }
    @Transactional
    public void eliminar(Long id) { repository.delete(entidad(id)); }

    private double precioFinito(double precio) {
        if (!Double.isFinite(precio)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El precio debe ser un número finito");
        }
        return precio;
    }

    // Si cualquier ID no existe, la excepción revierte incluso los cambios anteriores.
    @Transactional
    public List<Vista> precios(Lote lote) {
        if (lote.cambios().stream().map(Cambio::id).distinct().count() != lote.cambios().size())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No repitas productos en el lote");
        return lote.cambios().stream().map(c -> {
            var p = entidad(c.id()); p.setPriceJPA(precioFinito(c.precio()));
            return Vista.de(repository.save(p));
        }).toList();
    }
}
