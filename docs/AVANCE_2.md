# Avance 2: evaluación y demostración

Evaluación del sistema contra las dos hojas de la rúbrica proporcionada: cinco criterios (20 puntos) y doce acciones de la lista F12. La nota definitiva corresponde al docente y depende de la exposición y sus evidencias.

## Evaluación de los cinco criterios

| Criterio | Máximo | Situación encontrada | Implementación y evidencia actual |
| --- | ---: | --- | --- |
| CRUD y persistencia JPA/Hibernate | 4 | CRUD MVC existente; edición y eliminación mediante POST | API POST/GET/PUT/DELETE sobre la misma tabla `productos`, DTO validados, 201 con Location, 404 si el ID no existe y 204 al eliminar. Pruebas de repositorio y comprobación en navegador con SQL Server. |
| JPQL y transacciones | 4 | Consultas derivadas de nombres de métodos y transacciones simples | `ProductoRepository.buscar` usa JPQL explícito con nombre, categoría y rango de precio. `ProductoApiService.precios` guarda un lote completo o revierte todos sus cambios ante un ID inexistente. Commit y rollback comprobados con una nueva consulta en SQL Server. |
| Spring Security y roles | 4 | Roles ADMIN/USER y protección de páginas; login enviaba también al usuario normal al panel administrativo | API: USER y ADMIN consultan; solo ADMIN crea, edita, elimina y modifica precios. Solicitudes de USER rechazadas con 403. Login MVC vuelve al catálogo. |
| JWT y protección de endpoints | 5 | Sin JWT ni API Bearer | Login JSON autentica las credenciales contra BD y devuelve JWT RS256 de 30 minutos. API sin sesión, valida firma, emisor y vigencia. Pruebas de token ausente, inválido, alterado y expirado: 401; usuario sin permiso: 403. |
| Integración y demostración F12 | 3 | Formularios MVC sin flujo PUT/DELETE ni Bearer | `/login` realiza login JSON y abre `/panel`, que ejecuta fetch para CRUD, consulta JPQL y lote. Botones para comprobar token ausente e inválido. Exponer en Network los doce pasos siguientes y ocultar credenciales y tokens en capturas. |

Los cambios cubren las capacidades del nivel Excelente. Para reclamar los 20 puntos, completa la exposición y conserva las evidencias de navegador y base de datos; no basta con mostrar este documento.

## Preparación

Desde la carpeta que contiene `pom.xml`:

```powershell
mvn spring-boot:run
```

Abre `http://localhost:8080/inicio` y pulsa el botón verde Iniciar sesión. El formulario de `/login` abre automáticamente `/panel` tras autenticar la cuenta. Si 8080 está ocupado, puedes ejecutar:

```powershell
mvn spring-boot:run '-Dspring-boot.run.arguments=--server.port=8081'
```

En ese caso usa `http://localhost:8081/inicio`. SQL Server debe estar activo en 1433 con la base `PandaBobbaBD` y las credenciales configuradas en `application.properties`.

Cuentas académicas creadas al iniciar: `admin` / `admin123` y `user` / `user123`. No se muestran en los registros de inicio. La clave privada JWT se genera en memoria al arrancar; reiniciar la aplicación invalida tokens anteriores y exige otro login. El navegador conserva el JWT en `sessionStorage` durante la sesión de la pestaña para permitir la navegación y la recarga. No se guarda la contraseña. Al cerrar sesión se elimina el token y al expirar se vuelve a `/login`.

## Los doce pasos de la hoja Demostración F12

1. Abre F12 > Network. Activa Preserve log y filtra Fetch/XHR o `api`. Mantén visible la aplicación al realizar las acciones.
2. Inicia sesión como administrador y registra un producto desde Nuevo producto: POST `/api/productos`, Payload JSON y respuesta 201 con el ID creado. La creación no acepta un ID del cliente.
3. Consulta el listado con Buscar: GET `/api/productos`, respuesta 200 y lista JSON. Abre Response o Preview.
4. Pulsa Editar en tu producto temporal, modifica el precio y guarda: PUT `/api/productos/{id}`, Payload y respuesta 200.
5. Después de completar los pasos de transacción, elimina solamente tu registro temporal: DELETE `/api/productos/{id}`, confirmación y respuesta 204 sin cuerpo.
6. Recarga y busca tu producto antes de eliminarlo. La sesión se conserva si el JWT sigue vigente. En SQL Server ejecuta la consulta inferior y compara ID, nombre y precio. Tras eliminarlo, confirma su ausencia también en BD.
7. Busca el nombre del producto, selecciona su categoría y fija mínimo/máximo: GET con parámetros `texto`, `categoria`, `minimo`, `maximo`. Explica la consulta `@Query` JPQL de `ProductoRepository.buscar` y comprueba que los resultados respetan todos los filtros.
8. En Actualización de precios en lote, edita el nuevo precio de dos productos temporales. Pulsa Vista previa de cambios, compara precio actual y nuevo y confirma: PATCH `/api/productos/precios` responde 200 y ambos cambios aparecen en BD (commit). Para demostrar rollback, reenvía desde DevTools la solicitud PATCH sustituyendo uno de los IDs por uno inexistente: responde 404. Consulta de nuevo la lista y SQL Server: ninguno de los precios se modificó. No uses los productos originales para esta prueba.
9. Cierra sesión y vuelve a iniciarla: POST `/api/auth/login` con username/password; respuesta 200 con `accessToken`, `tokenType`, `expiresIn`, username y roles. Oculta la contraseña y el valor del token antes de capturar pantalla.
10. Selecciona un GET del catálogo en Network > Headers: muestra que existe `Authorization: Bearer …`; oculta su valor al exponer o compartir la captura.
11. Pulsa Consultar sin token y Consultar con token inválido: ambos GET responden 401. Los botones no modifican tu sesión activa.
12. Cierra sesión y entra como `user`. Consultar catálogo responde 200 y las acciones administrativas se ocultan. Abre Herramientas de demostración de acceso y pulsa Comprobar permiso de edición: envía un PUT con los mismos datos de un producto existente; el servidor devuelve 403 y el producto permanece. La autorización se aplica en el servidor, además de los controles visuales.

La secuencia de login precede al CRUD aunque la hoja F12 la enumera después. Usa dos productos temporales para la demostración de transacciones y elimínalos al finalizar.

Consulta de persistencia en SQL Server Management Studio:

```sql
USE PandaBobbaBD;
SELECT idProductos, name, description, category, price, imageURL
FROM productos
ORDER BY idProductos;
```

## Contrato HTTP

| Método | Ruta | Acceso | Resultado |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | Público | 200 JWT; 400 validación; 401 credenciales incorrectas |
| GET | `/api/auth/me` | USER/ADMIN | 200 identidad autenticada |
| GET | `/api/productos` | USER/ADMIN | 200 lista filtrada; 400 rango incorrecto |
| GET | `/api/productos/{id}` | USER/ADMIN | 200 producto; 404 ausente |
| POST | `/api/productos` | ADMIN | 201 creación y Location; 400 validación |
| PUT | `/api/productos/{id}` | ADMIN | 200 edición; 400 validación; 404 ausente |
| DELETE | `/api/productos/{id}` | ADMIN | 204 eliminación; 404 ausente |
| PATCH | `/api/productos/precios` | ADMIN | 200 lote; 400 datos/IDs repetidos; 404 y rollback si falta un producto |

Cada endpoint protegido devuelve 401 ante token ausente/inválido. Las escrituras con rol USER devuelven 403.

Producto JSON: `nombre`, `descripcion`, `categoria`, `precio`, `imagen`. La imagen acepta una ruta `/images/` o URL HTTPS. El precio debe ser positivo. Lote: `{"cambios":[{"id":1,"precio":10.50},{"id":2,"precio":11.00}]}`. Utiliza los IDs de tus registros temporales.

## Validación ejecutada

`mvn test`: cuatro pruebas, cero errores y cero fallos. H2 se utiliza exclusivamente para pruebas automatizadas; la ejecución normal sigue usando SQL Server.

Las pruebas integradas verifican login, JWT expirado/alterado/incorrecto/ausente, 403 en los cuatro tipos de escritura, CRUD persistido, filtro JPQL, validación, rango incorrecto, ID inexistente, commit y rollback. La prueba de rollback lee nuevamente el repositorio fuera de la transacción fallida.

En el navegador conectado a SQL Server se comprobó login de administrador, listado, POST 201, PUT 200, consulta por nombre, PATCH con rollback 404 seguido de GET con precio original, PATCH correcto con precio persistido, GET sin token e inválido 401 y PUT con rol USER 403. La cuenta USER volvió a consultar el registro y confirmó el precio persistido. El registro temporal fue eliminado mediante la API con 204 y una consulta posterior devolvió una lista vacía.

La captura `evidencias/rol-user-403.png` muestra el rechazo de edición desde la interfaz. La guía detalla la exposición F12 y las capturas adicionales que debes preparar para mostrar Headers, Payload, Response y el resultado en SQL Server.

## Diseño y experiencia de uso

El menú público contiene únicamente Inicio, Productos, Nosotros y el botón verde Iniciar sesión. El acceso tiene su propia pantalla y abre el panel, cuyo menú agrupa Gestión de catálogo y Precios en lote. La gestión usa el diseño nuevo; las rutas del panel anterior redirigen al actual.

El sitio público se inspira en la plantilla Wix indicada: composición editorial, fondo crema, títulos serif grandes, líneas finas, fotos protagonistas y acentos verdes del panel. Inicio, Productos y Nosotros conservan los datos y las imágenes de Panda Bobba. El login comparte esta identidad y abre el panel al autenticar la cuenta.

El panel adopta el estilo de la referencia de dashboard: fondo gris, menú superior en cápsula, tarjetas blancas redondeadas, accesos laterales compactos y acentos verdes. `panel-dashboard.css` aplica el diseño al panel.

La gestión de precios usa una tabla editable con precio actual, precio nuevo y diferencia. Los borradores no se envían hasta confirmar la vista previa. Restablecer descarta los cambios pendientes. Se guarda un solo lote transaccional de hasta 50 cambios; no se añadió historial de precios, de acuerdo con el modelo elegido.

Se verificó el nuevo modelo desde el navegador con un registro temporal: creación a S/ 1.00, vista previa a S/ 1.25 y confirmación con persistencia. El registro se eliminó tras la comprobación; los seis productos originales se conservaron.

- Menú superior con Resumen, Gestión de catálogo y Precios en lote; etiquetas compactas en móvil.
- Resumen de resultados que se actualiza con la búsqueda: cantidad, categorías y precio promedio.
- Gráfico con la cantidad real de productos por categoría, precios mínimo/máximo y fotos de la selección. No muestra ingresos o variaciones inventadas.
- Filas con foto, descripción, ID, categoría y precio; en móvil se presentan como tarjetas.
- Creación y edición en un diálogo con foco inicial, campos etiquetados, mensajes de validación y cierre por Escape.
- Eliminación con confirmación que identifica el producto y enfoca primero Conservar producto.
- Estados de carga, resultados vacíos, limpieza de filtros, cierre de sesión y recuperación cuando la sesión expira.
- Acciones administrativas visibles solo para ADMIN. Las comprobaciones JWT/403 se agrupan en un apartado desplegable de demostración.
- Foco visible, enlace para saltar al contenido, avisos accesibles y reducción de movimiento según la preferencia del dispositivo.

Se verificó la interfaz a 1440 píxeles y 390 píxeles, incluyendo formularios, búsqueda sin resultados, confirmación de eliminación y controles por rol. La vista móvil no presentó desbordamiento horizontal.

Una consulta independiente mediante `sqlcmd` confirmó seis productos persistidos y cero registros con el nombre del producto temporal al finalizar la verificación.

JWT usa el Resource Server oficial de Spring Security: https://docs.spring.io/spring-security/reference/6.5/servlet/oauth2/resource-server/jwt.html
