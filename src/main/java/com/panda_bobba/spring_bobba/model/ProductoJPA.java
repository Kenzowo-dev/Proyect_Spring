package com.panda_bobba.spring_bobba.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

@Entity
@Table(name = "productos")
public class ProductoJPA {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "idProductos")
    private Long idJPA;

    @NotBlank(message = "El nombre no puede estar vacío")
    @Size(max = 100, message = "El nombre no puede superar 100 caracteres")
    @Column(name = "name")
    private String nameJPA;

    @NotBlank(message = "La descripción no puede estar vacía")
    @Size(max = 255, message = "La descripción no puede superar 255 caracteres")
    @Column(name = "description")
    private String descriptionJPA;

    @NotBlank(message = "La URL de la imagen no puede estar vacía")
    @Column(name = "imageURL")
    private String imageURLJPA;

    @NotNull(message = "El precio no puede ser nulo")
    @Positive(message = "El precio debe ser positivo")
    @Column(name = "price")
    private double priceJPA;

    @NotBlank(message = "La categoría no puede estar vacía")
    @Size(max = 50, message = "La categoría no puede superar 50 caracteres")
    @Column(name = "category")
    private String categoryJPA;

    public Long getIdJPA() {
        return idJPA;
    }

    public void setIdJPA(Long idJPA) {
        this.idJPA = idJPA;
    }

    public String getNameJPA() {
        return nameJPA;
    }

    public void setNameJPA(String nameJPA) {
        this.nameJPA = nameJPA;
    }

    public String getDescriptionJPA() {
        return descriptionJPA;
    }

    public void setDescriptionJPA(String descriptionJPA) {
        this.descriptionJPA = descriptionJPA;
    }

    public String getImageURLJPA() {
        return imageURLJPA;
    }

    public void setImageURLJPA(String imageURLJPA) {
        this.imageURLJPA = imageURLJPA;
    }

    public double getPriceJPA() {
        return priceJPA;
    }

    public void setPriceJPA(double priceJPA) {
        this.priceJPA = priceJPA;
    }

    public String getCategoryJPA() {
        return categoryJPA;
    }

    public void setCategoryJPA(String categoryJPA) {
        this.categoryJPA = categoryJPA;
    }

}
