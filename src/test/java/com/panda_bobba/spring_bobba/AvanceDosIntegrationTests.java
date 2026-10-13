package com.panda_bobba.spring_bobba;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.panda_bobba.spring_bobba.repositories.ProductoRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.security.oauth2.jwt.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AvanceDosIntegrationTests {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired ProductoRepository repository;
    @Autowired JwtEncoder encoder;
    private String login(String usuario, String clave) throws Exception {
        var result = mvc.perform(post("/api/auth/login").contentType("application/json")
            .content(json.writeValueAsString(Map.of("username",usuario,"password",clave))))
            .andExpect(status().isOk()).andExpect(jsonPath("tokenType").value("Bearer")).andReturn();
        return "Bearer "+json.readTree(result.getResponse().getContentAsString()).get("accessToken").asText();
    }
    private Map<String,Object> datos(String nombre, double precio) {
        return Map.of("nombre",nombre,"descripcion","Producto de prueba","categoria","Bubble Tea","precio",precio,"imagen","/images/oreo.jpg");
    }
    @Test void jwtYRolesRechazanAccesosIncorrectos() throws Exception {
        mvc.perform(get("/api/productos")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/productos").header("Authorization","Bearer incorrecto")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/login").contentType("application/json").content("{\"username\":\"admin\",\"password\":\"incorrecta\"}"))
            .andExpect(status().isUnauthorized());
        var user = login("user","user123");
        mvc.perform(get("/api/productos").header("Authorization",user)).andExpect(status().isOk());
        mvc.perform(post("/api/productos").header("Authorization",user).contentType("application/json").content(json.writeValueAsString(datos("Sin permiso",10))))
            .andExpect(status().isForbidden());
        mvc.perform(put("/api/productos/1").header("Authorization",user).contentType("application/json").content(json.writeValueAsString(datos("Sin permiso",10))))
            .andExpect(status().isForbidden());
        mvc.perform(delete("/api/productos/1").header("Authorization",user)).andExpect(status().isForbidden());
        mvc.perform(patch("/api/productos/precios").header("Authorization",user).contentType("application/json").content("{}"))
            .andExpect(status().isForbidden());
        var claims = JwtClaimsSet.builder().issuer("panda-bobba").subject("admin")
            .issuedAt(Instant.now().minusSeconds(3600)).expiresAt(Instant.now().minusSeconds(120))
            .claim("roles",List.of("ROLE_ADMIN")).build();
        var expired = encoder.encode(JwtEncoderParameters.from(claims)).getTokenValue();
        mvc.perform(get("/api/productos").header("Authorization","Bearer "+expired)).andExpect(status().isUnauthorized());
        var token = login("admin","admin123");
        var altered = token.substring(0,token.lastIndexOf('.')+1)+"AAAA";
        mvc.perform(get("/api/productos").header("Authorization",altered)).andExpect(status().isUnauthorized());
    }
    @Test void crudConsultaYTransaccionPersistenYRevierten() throws Exception {
        var token = login("admin","admin123");
        var result = mvc.perform(post("/api/productos").header("Authorization",token).contentType("application/json")
            .content(json.writeValueAsString(datos("Prueba avance",15))))
            .andExpect(status().isCreated()).andExpect(header().exists("Location")).andReturn();
        long id = json.readTree(result.getResponse().getContentAsString()).get("id").asLong();
        try {
            assertThat(repository.findById(id).orElseThrow().getPriceJPA()).isEqualTo(15);
            mvc.perform(get("/api/productos").param("texto","Prueba avance").param("categoria","Bubble Tea").param("minimo","14").param("maximo","16")
                .header("Authorization",token)).andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value(id));
            mvc.perform(get("/api/productos").param("minimo","20").param("maximo","10").header("Authorization",token)).andExpect(status().isBadRequest());
            mvc.perform(put("/api/productos/"+id).header("Authorization",token).contentType("application/json")
                .content(json.writeValueAsString(datos("Prueba editada",16))))
                .andExpect(status().isOk()).andExpect(jsonPath("precio").value(16));
            mvc.perform(patch("/api/productos/precios").header("Authorization",token).contentType("application/json")
                .content(json.writeValueAsString(Map.of("cambios",List.of(Map.of("id",id,"precio",20),Map.of("id",Long.MAX_VALUE,"precio",30))))))
                .andExpect(status().isNotFound());
            assertThat(repository.findById(id).orElseThrow().getPriceJPA()).isEqualTo(16);
            mvc.perform(patch("/api/productos/precios").header("Authorization",token).contentType("application/json")
                .content(json.writeValueAsString(Map.of("cambios",List.of(Map.of("id",id,"precio",20))))))
                .andExpect(status().isOk());
            assertThat(repository.findById(id).orElseThrow().getPriceJPA()).isEqualTo(20);
            mvc.perform(post("/api/productos").header("Authorization",token).contentType("application/json")
                .content(json.writeValueAsString(datos("Inválido",-1)))).andExpect(status().isBadRequest());
            mvc.perform(delete("/api/productos/"+id).header("Authorization",token)).andExpect(status().isNoContent());
            assertThat(repository.existsById(id)).isFalse();
            mvc.perform(get("/api/productos/"+id).header("Authorization",token)).andExpect(status().isNotFound());
            mvc.perform(put("/api/productos/"+id).header("Authorization",token).contentType("application/json")
                .content(json.writeValueAsString(datos("No recrear",10)))).andExpect(status().isNotFound());
        } finally { repository.deleteById(id); }
    }
    @Test void pantallaDeGestionDisponible() throws Exception {
        mvc.perform(get("/gestion")).andExpect(status().is3xxRedirection()).andExpect(redirectedUrl("/panel"));
        mvc.perform(get("/panel")).andExpect(status().isOk()).andExpect(view().name("gestion"));
        mvc.perform(get("/login")).andExpect(status().isOk()).andExpect(view().name("login"));
        for (var ruta : List.of("/inicio", "/productos", "/nosotros")) {
            var html = mvc.perform(get(ruta)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
            assertThat(html).contains("public-login-button", "href=\"/login\"");
            assertThat(html).doesNotContain("href=\"/gestion\"", "href=\"/admin/productos\"");
        }
    }
}
