# Demostración de Panda Bobba

Usa la aplicación conectada a una base SQL Server de demostración. Abre `/app/`, entra en **DevTools → Network**, activa **Preserve log** y filtra **Fetch/XHR**. Utiliza un nombre único como `Bobba Demo Sustentacion 2026` para reconocer la fila. Al capturar evidencia, cubre las contraseñas y los valores de JWT.

| Acción desde Angular | Qué mostrar en Network | Comprobación |
| --- | --- | --- |
| Abre `#/catalogo/nuevo` en una pestaña sin sesión | El guard dirige a `#/acceso` | No se abre el formulario |
| Entra como `admin` | POST `/api/auth/login` → 200. En Response muestra nombres de campos, vigencia y rol | Angular abre el catálogo |
| Envía un producto vacío o con precio cero | Angular muestra mensajes y no envía POST | Corrige los campos en pantalla |
| Crea el producto a S/ 12.50 | POST `/api/productos` → 201. Muestra Payload, Response y `Location` en Response Headers | Consulta la fila en SQL Server |
| Busca por nombre y recarga la página | GET `/api/productos?texto=…` → 200. Muestra Query String, Response y encabezado Bearer sin su valor | Reaparece el producto guardado |
| Abre Editar y guarda a S/ 13.75 | GET `/api/productos/{id}` y PUT a la misma ruta → 200. Muestra el precio en Payload y Response | Consulta el nuevo precio en SQL Server |
| Ingresa S/ 14.25 en el campo de nuevo precio, revisa y confirma | PATCH `/api/productos/precios` → 200 | Recarga y consulta el precio en SQL Server |
| En **Comprobar acceso a la API**, prueba sin token y con token inválido | Dos GET `/api/productos` → 401. Compara Request Headers | El panel muestra ambos resultados y conserva la sesión |
| Cierra sesión y entra como `user` | Login → 200 con `ROLE_USER` y catálogo → 200 | El catálogo es de consulta |
| Abre `#/catalogo/nuevo` con `user` y vuelve al catálogo | El guard dirige a `#/sin-permiso` | Se explica el permiso requerido |
| Pulsa **Comprobar permiso de escritura** con `user` | POST `/api/productos` → 403 | El servidor rechaza la solicitud y no crea una fila |
| Vuelve como `admin` y confirma la eliminación del producto temporal | DELETE `/api/productos/{id}` → 204, con Response vacío | Refresca y confirma que la fila ya no existe |

Consulta directa antes y después de cada escritura en SSMS u otro cliente de SQL Server.

```sql
USE PandaBobbaBD;
SELECT DB_NAME() AS base_actual;
SELECT * FROM dbo.productos WHERE name = N'Bobba Demo Sustentacion 2026';
```

Conserva una captura de Payload/201/Location, otra de Response y Bearer, las respuestas 401 y 403, y la comprobación SQL tras crear, actualizar y eliminar. Para acreditar el despliegue, repite el recorrido sobre el dominio publicado y registra la URL junto con el resultado del workflow.

La prueba del lote inválido se ejecuta en Maven. Usa un lote con un producto real y un ID inexistente, espera 404 y lee la fila fuera de la transacción para confirmar que su precio sigue igual.
