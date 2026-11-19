# Panda Bobba

Panda Bobba permite consultar el catálogo de bebidas y administrar sus fichas. Angular ofrece la experiencia de gestión, Spring Boot aplica permisos y validaciones en la API REST, y JPA guarda los cambios en la base de datos. El sitio público y el panel Thymeleaf del avance anterior siguen disponibles.

## Demostración local

Para construir el JAR necesitas un JDK 17 o superior, Maven 3.9 y Node.js 24 con npm disponibles en la terminal. Desde la carpeta `Proyect_Spring` ejecuta:

```sh
node scripts/package-demo.mjs
java -jar target/spring_bobba-0.0.1-SNAPSHOT.jar --spring.profiles.active=demo
```

Abre [el catálogo Angular](http://127.0.0.1:8080/gestion-catalogo/) y elige una cuenta de demostración.

| Cuenta | Contraseña local | Permisos |
|---|---|---|
| `admin` | `admin123` | Consultar, crear, editar y eliminar productos |
| `user` | `user123` | Consultar el catálogo y el detalle |

El perfil `demo` escucha en `127.0.0.1` y guarda la base H2 en `.data/panda-bobba.mv.db`. Reinicia el mismo JAR desde la misma carpeta para volver a abrir la base. Puedes aislar otra ejecución con `PANDA_DEMO_DB_PATH` (ruta sin extensión). Si el puerto 8080 está ocupado, añade `--server.port=8089` al comando de Java.

El catálogo público está en [Inicio](http://127.0.0.1:8080/) y el panel anterior en [Panel Thymeleaf](http://127.0.0.1:8080/panel).

## Desarrollo

Ejecuta el backend con `mvn spring-boot:run "-Dspring-boot.run.profiles=demo"`. En otra terminal, entra a `frontend/` y ejecuta `npm ci` y `npm start`. El proxy de Angular envía `/api/` y `/images/` a Spring Boot en el puerto 8080.

- `mvn -B test` ejecuta las pruebas de integración con H2 en memoria.
- `npm run build` dentro de `frontend/` genera una compilación de producción de Angular.
- `node scripts/package-demo.mjs` incluye esa compilación en el JAR y ejecuta las pruebas Maven.

## Perfil SQL Server

Crea la base `PandaBobbaBD` y configura `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME` y `SPRING_DATASOURCE_PASSWORD`. En instalaciones nuevas puedes aprovisionar las cuentas iniciales mediante `PANDA_BOOTSTRAP_ADMIN_PASSWORD` y `PANDA_BOOTSTRAP_USER_PASSWORD`. Inicia el JAR sin activar `demo` para usar el perfil SQL Server.

## Documentación del sistema

- [Funcionalidades, API REST, seguridad y persistencia](docs/SISTEMA.md)
