# Sistema Panda Bobba

Panda Bobba tiene un sitio público para explorar el menú y un catálogo protegido para consultar y administrar las bebidas. Angular presenta el catálogo en `/gestion-catalogo/`. Spring Boot sirve la API REST y el panel Thymeleaf en `/panel`.

## Funcionalidades

- El sitio público permite navegar entre Inicio, Productos y Nosotros.
- En Angular, el personal puede buscar productos por nombre, descripción o categoría, ver sus fotos y precios y abrir la ficha de cada bebida.
- El rol `ADMIN` puede registrar, editar y eliminar fichas. Los formularios muestran errores por campo y la eliminación requiere confirmar el producto seleccionado.
- El panel Thymeleaf incluye un resumen del catálogo, filtros por nombre, categoría y rango de precio, y edición de precios en lote con vista previa antes de guardar.

## API REST

| Método | Ruta | Acceso | Respuesta exitosa |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | Público | `200` con JWT, vigencia y roles |
| GET | `/api/auth/me` | `USER`, `ADMIN` | `200` con identidad y roles |
| GET | `/api/categorias` | `USER`, `ADMIN` | `200` con nombres de categorías |
| GET | `/api/productos` | `USER`, `ADMIN` | `200` con listado filtrado |
| GET | `/api/productos/{id}` | `USER`, `ADMIN` | `200` con la ficha |
| POST | `/api/productos` | `ADMIN` | `201` con la ficha creada y la cabecera `Location` |
| PUT | `/api/productos/{id}` | `ADMIN` | `200` con la ficha actualizada |
| DELETE | `/api/productos/{id}` | `ADMIN` | `204` sin cuerpo |
| PATCH | `/api/productos/precios` | `ADMIN` | `200` con las fichas actualizadas |

La ficha contiene `nombre`, `descripcion`, `categoria`, `precio` e `imagen`. El precio debe ser positivo y la imagen admite una ruta `/images/` o una URL HTTPS. El servidor devuelve `400` con el detalle de los errores de validación y `404` cuando falta un producto solicitado.

El listado acepta `texto`, `categoria`, `minimo` y `maximo`. La consulta JPQL de `ProductoRepository.buscar` aplica los filtros combinados. La actualización de precios recibe `{"cambios":[{"id":1,"precio":10.50}]}` y admite hasta 50 cambios. Rechaza IDs repetidos y revierte el lote completo si falta uno de los productos.

## Seguridad y datos

Spring Security verifica las credenciales de las cuentas persistidas con BCrypt. El JWT usa RS256, dura 30 minutos y se firma con una clave generada al arrancar. Después de reiniciar hay que volver a iniciar sesión. Angular guarda el token en `sessionStorage`, adjunta `Authorization: Bearer` mediante un interceptor y controla la navegación con guards. La API aplica los permisos en cada solicitud. Devuelve `401` si falta una credencial válida y `403` si el rol carece del permiso solicitado.

Spring Data JPA guarda el catálogo en la tabla `productos`. El perfil `demo` usa H2 en disco para conservar datos entre reinicios, las pruebas de integración usan H2 en memoria y el perfil estándar puede conectarse a SQL Server. Consulta la [guía de arranque y pruebas](../README.md) para configurar cada entorno.
