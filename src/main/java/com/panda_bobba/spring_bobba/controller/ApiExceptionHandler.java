package com.panda_bobba.spring_bobba.controller;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
@RestControllerAdvice(assignableTypes={ApiAuthController.class, ProductoApiController.class})
public class ApiExceptionHandler {
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> validacion(MethodArgumentNotValidException ex) {
        return ResponseEntity.badRequest().body(Map.of("message", "Revisa los datos ingresados", "errors",
            ex.getBindingResult().getFieldErrors().stream().map(e -> e.getField()+": "+e.getDefaultMessage()).toList()));
    }
}
