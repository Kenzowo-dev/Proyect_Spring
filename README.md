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

## Despliegue en Dokploy

El servicio debe usar la raíz del repositorio como **Build Path** (`/`) y el tipo **Dockerfile**. El Dockerfile compila Angular y Spring Boot y ejecuta las pruebas Maven durante el build. La aplicación escucha en `PORT` (8080 por defecto).

Crea primero una base de datos PostgreSQL accesible desde la red Docker y configura estos secretos/variables en el servicio `frontend` de Dokploy:

- `SPRING_DATASOURCE_URL`: `jdbc:postgresql://<host-interno-postgres>:5432/<base>`.
- `SPRING_DATASOURCE_USERNAME` y `SPRING_DATASOURCE_PASSWORD`: usuario de PostgreSQL con permisos sobre la base.
- `PANDA_BOOTSTRAP_ADMIN_PASSWORD`: contraseña de al menos 12 caracteres para crear el usuario inicial `admin` si aún no existe.
- `PANDA_BOOTSTRAP_USER_PASSWORD`: contraseña de al menos 12 caracteres para crear el usuario inicial `user` si aún no existe; es opcional.

No hay credenciales de base de datos predeterminadas. Si la base ya contiene cuentas creadas con contraseñas de demostración antiguas, cámbialas antes de hacer pública la aplicación. Hibernate actualiza el esquema (`ddl-auto=update`); respalda la base antes de actualizar una instalación existente.

## Documentación del sistema

- [Funcionalidades, API REST, seguridad y persistencia](docs/SISTEMA.md)
