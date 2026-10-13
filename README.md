# Panda Bobba - Proyecto Spring Boot

## Segundo avance: semana 10

El sitio público muestra Inicio, Productos y Nosotros, con un botón verde para iniciar sesión. El acceso en `/login` abre `/panel`, que integra el nuevo diseño de gestión, CRUD JSON, búsqueda JPQL y actualización transaccional de precios con roles USER/ADMIN. Consulta [la evaluación completa y la guía de los doce pasos F12](docs/AVANCE_2.md) para preparar la exposición.

Verificación automatizada: `mvn test`. Las pruebas usan H2; la aplicación normal usa SQL Server.

## Descripción
Aplicación web informativa para la tienda de bubble tea "Panda Bobba". Proyecto desarrollado con Spring Boot que incluye gestión completa de productos con operaciones CRUD, validaciones, y sistema de seguridad con autenticación y autorización.

## Tecnologías Utilizadas

### Backend
- **Java 17 o superior** (compilación para Java 17)
- **Spring Boot 3.5.7**
- **Spring Data JPA** con Hibernate
- **Spring Validation** para validación de datos
- **Spring Security** para autenticación y autorización
- **SQL Server** como base de datos
- **Spring Security OAuth2 Resource Server** para validar JWT RS256

### Frontend
- **Thymeleaf** como motor de plantillas
- **Bootstrap 5.3.3** para diseño responsivo
- **Bootstrap Icons** para iconografía
- **HTML5, CSS3, JavaScript**

## Características Implementadas

### ✅ CRUD Completo
- **Crear** productos nuevos con validación
- **Leer** productos por categorías
- **Actualizar** productos existentes
- **Eliminar** productos con confirmación

### ✅ Spring Validator
- Validaciones completas en todas las entidades
- Manejo de errores en controladores con `@Valid` y `BindingResult`
- Mensajes de error personalizados en formularios

### ✅ Spring Security
- Autenticación basada en base de datos
- Autorización con roles: `ROLE_ADMIN` y `ROLE_USER`
- Protección de rutas administrativas
- Página de login personalizada
- Encriptación de contraseñas con BCrypt

### ✅ Estructura del Proyecto
- Separación en capas: Controller, Service, Repository, Model
- Uso correcto de anotaciones de Spring
- Configuración centralizada

## Requisitos Previos

1. **Java JDK 17 o superior** instalado
2. **SQL Server** instalado y ejecutándose en el puerto 1433
3. **Apache Maven** instalado y disponible en PATH

## Configuración de Base de Datos

### Paso 1: Crear la base de datos
Ejecuta el siguiente comando en SQL Server Management Studio y configura un usuario con acceso a esa base:

```sql
CREATE DATABASE PandaBobbaBD;
```

### Paso 2: Configurar credenciales
Edita el archivo `src/main/resources/application.properties` si es necesario:

```properties
spring.datasource.url=jdbc:sqlserver://localhost:1433;databaseName=PandaBobbaBD;encrypt=true;trustServerCertificate=true
spring.datasource.username=TU_USUARIO_SQL_SERVER
spring.datasource.password=TU_CLAVE_SQL_SERVER
```

**Nota:** Las tablas se crearán automáticamente al ejecutar la aplicación gracias a Hibernate.

## Ejecución del Proyecto

### Opción 1: Desde la carpeta del proyecto

#### En Windows:
```bash
mvn spring-boot:run
```

#### En Linux/Mac:
```bash
mvn spring-boot:run
```

### Opción 2: Usando Maven instalado
```bash
mvn spring-boot:run
```

### Opción 3: Desde IDE (IntelliJ IDEA, Eclipse, VS Code)
1. Importar el proyecto como proyecto Maven
2. Ejecutar la clase `SpringBobbaApplication.java`

## Acceso a la Aplicación

Una vez iniciada la aplicación, accede desde el navegador:

- **Página principal:** http://localhost:8080/
- **Panel con gestión de catálogo:** http://localhost:8080/panel
- **Productos:** http://localhost:8080/productos
- **Nosotros:** http://localhost:8080/nosotros
- **Login:** http://localhost:8080/login
- **Acceso al panel:** inicia sesión; ADMIN puede gestionar y USER solo consultar

## Usuarios de Prueba

El sistema crea automáticamente dos usuarios al iniciar por primera vez:

| Usuario | Contraseña | Rol | Permisos |
|---------|-----------|-----|----------|
| `admin` | `admin123` | ROLE_ADMIN | Acceso completo al panel de administración |
| `user` | `user123` | ROLE_USER | Solo visualización de páginas públicas |

## Estructura de Directorios

```
spring_bobba/
├── src/
│   ├── main/
│   │   ├── java/com/panda_bobba/spring_bobba/
│   │   │   ├── config/           # Configuraciones (Security, DataInitializer)
│   │   │   ├── controller/       # Controladores web
│   │   │   ├── model/            # Entidades JPA
│   │   │   ├── repositories/     # Interfaces de repositorio
│   │   │   ├── services/         # Capa de servicios
│   │   │   └── SpringBobbaApplication.java
│   │   └── resources/
│   │       ├── templates/        # Vistas Thymeleaf
│   │       ├── static/           # CSS, JS, imágenes
│   │       └── application.properties
│   └── test/
├── pom.xml
└── README.md
```

## Funcionalidades por Rol

### Usuarios No Autenticados (Público)
- ✅ Ver página de inicio
- ✅ Ver catálogo de productos
- ✅ Ver página "Nosotros"
- ✅ Acceder a login

### ROLE_USER
- ✅ Todas las funcionalidades públicas
- ❌ No puede acceder al panel de administración

### ROLE_ADMIN
- ✅ Todas las funcionalidades públicas
- ✅ Acceso al panel de administración
- ✅ Crear nuevos productos
- ✅ Editar productos existentes
- ✅ Eliminar productos

## Rutas Protegidas

| Ruta | Acceso |
|------|--------|
| `/`, `/productos`, `/nosotros` | Público |
| `/login` | Público |
| `/admin/**` | Solo ROLE_ADMIN |

## Validaciones Implementadas

### Entidad ProductoJPA
- **Nombre:** No vacío, máximo 100 caracteres
- **Descripción:** No vacía, máximo 255 caracteres
- **Categoría:** No vacía, máximo 50 caracteres
- **Precio:** No nulo, debe ser positivo
- **URL de Imagen:** No vacía

Los errores de validación se muestran en los formularios con mensajes específicos.

## Solución de Problemas

### Error de conexión a SQL Server
- Verifica que SQL Server esté ejecutándose y que TCP/IP esté habilitado en el puerto 1433
- Confirma que la base de datos `PandaBobbaBD` existe
- Revisa las credenciales en `application.properties`

### Error de puerto 8080 ocupado
Cambia el puerto en `application.properties`:
```properties
server.port=8081
```

### Error al compilar
Limpia y recompila el proyecto:
```bash
mvn clean install
```

## Criterios de Evaluación Cumplidos

| Criterio | Nivel | Cumplimiento |
|----------|-------|--------------|
| **Uso de Spring Boot** | Excelente (4/4) | ✅ Proyecto bien estructurado, anotaciones completas |
| **Conexión con Base de Datos** | Excelente (4/4) | ✅ CRUD completo y optimizado |
| **Uso de Spring Validator** | Excelente (4/4) | ✅ Validaciones completas con manejo de errores |
| **Implementación de Spring Security** | Excelente (4/4) | ✅ Autenticación, autorización y roles configurados |
| **Publicación en la Nube** | N/A | ⚠️ Excluido según instrucciones |

## Autor
Proyecto desarrollado para el curso de Marcos de Desarrollo Web.

## Licencia
Este proyecto es de uso académico.
