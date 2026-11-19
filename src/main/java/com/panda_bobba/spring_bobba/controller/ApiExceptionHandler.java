package com.panda_bobba.spring_bobba.controller;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice(assignableTypes = {
    ApiAuthController.class, CartaApiController.class, CategoriaApiController.class, PedidoApiController.class,
    ProductoApiController.class
})
public class ApiExceptionHandler {
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ValidationError> validacion(MethodArgumentNotValidException ex) {
        Map<String, String> fields = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(error ->
            fields.putIfAbsent(error.getField(), error.getDefaultMessage()));
        return invalidFields(fields);
    }

    static ResponseEntity<ValidationError> invalidFields(Map<String, String> fields) {
        var errors = fields.entrySet().stream()
            .map(error -> error.getKey() + ": " + error.getValue())
            .toList();
        return ResponseEntity.badRequest().body(new ValidationError("Revisa los datos ingresados", errors, fields));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, String>> datosInvalidos() {
        return ResponseEntity.badRequest().body(Map.of("message", "Envía un JSON válido con los tipos de datos esperados."));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, String>> parametroInvalido(MethodArgumentTypeMismatchException ex) {
        return ResponseEntity.badRequest().body(Map.of("message", "El parámetro «" + ex.getName() + "» tiene un valor inválido."));
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> errorControlado(ResponseStatusException ex) {
        return ResponseEntity.status(ex.getStatusCode()).headers(ex.getHeaders())
            .body(Map.of("message", ex.getReason() == null ? "No se pudo completar la operación." : ex.getReason()));
    }

    public record ValidationError(String message, List<String> errors, Map<String, String> fieldErrors) {}
}
