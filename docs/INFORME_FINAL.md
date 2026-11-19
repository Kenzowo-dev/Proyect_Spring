# Informe final de Panda Bobba

- **Proyecto:** Gestión de catálogo para una tienda de bubble tea
- **Área:** Desarrollo Web Integrado
- **Fecha:** 19 de noviembre de 2026
- **Rama:** `entrega/angular-sqlserver`

## 1. Resumen

Panda Bobba ofrece un sitio público y un catálogo de gestión. El catálogo usa Angular para acceder, consultar, filtrar y gestionar los productos mediante la API REST de Spring Boot. SQL Server persiste el catálogo y las cuentas. La aplicación incluye autorización por roles, formularios reactivos y una compilación para servir la interfaz y la API en un mismo origen.

## 2. Problema y objetivos

El avance anterior tenía una API y persistencia y gestionaba los productos mediante un panel con JavaScript. El objetivo de la entrega es integrar Angular en el recorrido evaluado, validar entradas tanto en cliente como en servidor, comprobar los permisos con los roles asignados a cada cuenta y demostrar persistencia mediante lecturas independientes en SQL Server.

## 3. Alcance funcional

| Rol | Operaciones |
| --- | --- |
| Visitante | Sitio público e inicio de sesión |
| USER | Consulta y búsqueda por nombre, categoría y rango de precios |
| ADMIN | Consulta, alta, edición, eliminación confirmada y actualización de precios en lote |

El formulario valida nombre, descripción, categoría, precio positivo e imagen. La interfaz comunica errores de campo, ausencia de productos, fallos del servidor y permisos insuficientes. Los DTO de Spring repiten las restricciones al recibir solicitudes. Las mutaciones del lote se guardan en una transacción.

## 4. Arquitectura y datos

`Formulario Angular → HttpClient → API REST de Spring → servicio → repositorio JPA → SQL Server`

- Angular usa formularios reactivos y rutas para acceso, catálogo, alta y edición. Un interceptor adjunta el Bearer a la API. Dos guards verifican sesión y acceso administrativo. El enrutamiento por fragmentos permite abrir una URL interna desde el JAR.
- Spring separa el controlador, el servicio transaccional y el repositorio. El repositorio usa JPQL para combinar filtros opcionales. SQL Server asigna la clave del producto al insertar y mantiene los datos tras recargar el navegador.
- Spring Security autentica las cuentas usando BCrypt, emite un JWT RS256 con una vigencia de 30 minutos y valida firma, emisor y vigencia en la API. Angular guarda la sesión de la pestaña en `sessionStorage`. El servidor genera la clave al arrancar, por lo que reiniciar requiere volver a iniciar sesión.
- Los roles y las cuentas residen en SQL Server. El usuario de consulta recibe 403 ante una escritura y la creación de cuentas de demostración toma sus contraseñas de la configuración del entorno.
- El Dockerfile compila Angular y lo incorpora al JAR. La misma imagen contiene la interfaz de gestión, la API y el sitio público. SQL Server se configura como servicio externo.

## 5. Pruebas y resultados

| Criterio oficial | Implementación y evidencia |
| --- | --- |
| **Integración Angular + Spring Boot + BD (4)** | Playwright verifica el flujo real del navegador contra Spring. La ejecución del workflow activa consultas SQL directas para comprobar alta, edición, lote y eliminación. |
| **Funcionalidades, formularios y validación (4)** | Formularios reactivos y validación de Spring. La prueba comprueba precio inválido, CRUD, búsqueda, recarga, actualizaciones en lote y confirmación de borrado. |
| **Seguridad, JWT y roles (4)** | El navegador comprueba rutas protegidas, encabezado Bearer, dos variantes de 401 y rechazo 403 por rol. Las pruebas Spring comprueban también tokens alterados y expirados. |
| **Demostración, DevTools y despliegue (4)** | El guion indica qué mostrar en Headers, Payload y Response. La imagen y la configuración de Railway están incluidas. |
| **Informe y sustentación técnica (4)** | Este informe documenta alcance, arquitectura, pruebas, conclusiones y preguntas de sustentación. El guion acompaña la exposición. |

**Resultados locales**

- Angular compiló en modo de producción y Maven generó el JAR con los archivos de Angular.
- Maven ejecutó 4 pruebas de Spring con H2, con 0 fallos y 0 errores.
- Chrome ejecutó el recorrido de Playwright contra Spring y H2, con 1 prueba aprobada. Se verificaron alta, consulta, edición, lote, recarga, eliminación, acceso por rol y respuestas 401 y 403.
- La ejecución de GitHub Actions con SQL Server, las capturas de DevTools y la verificación del dominio publicado quedan pendientes de acreditar.

## 6. Preguntas de sustentación

### ¿Por qué hay guards y reglas de Spring Security?

Los guards controlan la navegación y la experiencia en Angular. Spring decide si cada petición puede consultar o escribir datos, incluso si llega fuera de la interfaz.

### ¿Qué diferencia hay entre 401 y 403?

401 indica que Spring no pudo autenticar la solicitud. 403 indica que el token es válido y el rol carece del permiso requerido.

### ¿Qué significan 201, 200 y 204 en el catálogo?

201 confirma creación e incluye `Location` para el recurso. 200 devuelve una representación consultada o modificada. 204 confirma el borrado con cuerpo vacío.

### ¿Cómo se demuestra persistencia?

Se compara el JSON con un SELECT en la base, se recarga el catálogo mediante un GET nuevo y se comprueba el estado en SQL Server una vez eliminado el registro.

### ¿Qué pasa si falla una actualización en lote?

La excepción sale del servicio transaccional y Hibernate revierte la operación completa. Una lectura posterior confirma que los precios previos siguen almacenados.

### ¿Cómo se publica y se comunica Angular con la API?

La imagen genera un JAR con los archivos de Angular en `/app/`. Angular hace solicitudes relativas a `/api/`, por lo que el navegador usa el mismo origen. El servidor se conecta a SQL Server con JDBC.

## 7. Conclusiones

El flujo de gestión queda conectado a la API existente mediante Angular, con controles coherentes entre navegador y backend. La prueba de integración combina funcionalidad, permisos y comprobaciones independientes de persistencia. Para la sustentación, el [guion de demostración](DEMOSTRACION_FINAL.md) vincula cada operación con la solicitud HTTP y la fila de base de datos que la acredita.
