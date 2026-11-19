# Sistema Panda Bobba

Panda Bobba tiene una carta pública en `/productos` y un panel de administración en `/panel`. La carta abre en Angular y permite consultar las bebidas y registrar pedidos para recojo.

## Funcionalidades

- Cualquier visitante puede buscar bebidas, abrir sus fichas y ajustar el carrito. Para confirmar el pedido, el cliente debe crear una cuenta o iniciar sesión. El carrito se conserva durante el acceso. El nombre y el teléfono se solicitan al confirmar, y el pago se realiza en tienda.
- El administrador consulta los pedidos recibidos y los marca como entregados o cancelados.
- El rol `ADMIN` puede registrar, editar y eliminar fichas. Los formularios muestran errores por campo y la eliminación requiere confirmar el producto seleccionado.
- El panel Thymeleaf incluye un resumen del catálogo, filtros por nombre, categoría y rango de precio, y edición de precios en lote con vista previa antes de guardar.

## API REST

| Método | Ruta | Acceso | Respuesta exitosa |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | Público | `200` con JWT, vigencia y roles |
| POST | `/api/auth/register` | Público | `201` con la sesión del nuevo cliente |
| GET | `/api/carta` | Público | Listado de bebidas |
| GET | `/api/carta/{id}` | Público | Ficha de la bebida |
| POST | `/api/pedidos` | `USER`, `ADMIN` | Registro del pedido en la cuenta autenticada |
| GET | `/api/pedidos` | `ADMIN` | Listado de pedidos |
| PATCH | `/api/pedidos/{id}` | `ADMIN` | Confirmación de entrega o cancelación |
| GET | `/api/auth/me` | `USER`, `ADMIN` | `200` con identidad y roles |
| GET | `/api/categorias` | `USER`, `ADMIN` | `200` con nombres de categorías |
| GET | `/api/productos` | `USER`, `ADMIN` | `200` con listado filtrado |
| GET | `/api/productos/{id}` | `USER`, `ADMIN` | `200` con la ficha |
| POST | `/api/productos` | `ADMIN` | `201` con la ficha creada y la cabecera `Location` |
| PUT | `/api/productos/{id}` | `ADMIN` | `200` con la ficha actualizada |
| DELETE | `/api/productos/{id}` | `ADMIN` | `204` sin cuerpo |
| PATCH | `/api/productos/precios` | `ADMIN` | `200` con las fichas actualizadas |

La ficha contiene `nombre`, `descripcion`, `categoria`, `precio` e `imagen`. El precio debe ser positivo y la imagen admite una ruta `/images/` o una URL HTTPS. El servidor devuelve `400` con el detalle de los errores de validación y `404` cuando falta un producto solicitado.

El listado acepta `texto`, `categoria`, `minimo` y `maximo`. Los filtros se combinan en una sola consulta. La actualización de precios recibe `{"cambios":[{"id":1,"precio":10.50}]}` y admite hasta 50 cambios. Rechaza IDs repetidos y revierte el lote completo si falta uno de los productos.

## Seguridad y datos

Spring Security verifica las credenciales de las cuentas persistidas con BCrypt. El registro público otorga el rol `USER`. El JWT usa RS256, dura 30 minutos y se firma con una clave generada al arrancar. Después de reiniciar hay que volver a iniciar sesión. Angular guarda el token en `sessionStorage`, adjunta `Authorization: Bearer` mediante un interceptor y controla la navegación con guards. La API aplica los permisos en cada solicitud. Devuelve `401` si falta una credencial válida y `403` si el rol carece del permiso solicitado.

La carta y el panel consultan la misma tabla `productos`. Los pedidos nuevos se asocian a la cuenta que los confirma. Cada pedido conserva los nombres, cantidades y precios confirmados, aunque luego cambie la ficha de una bebida. El perfil `demo` usa H2 en disco para conservar datos entre reinicios, las pruebas de integración usan H2 en memoria y el perfil estándar se conecta a PostgreSQL. Consulta la [guía de arranque y pruebas](../README.md) para configurar cada entorno.
