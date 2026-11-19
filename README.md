# Panda Bobba

Aplicación web para una tienda de bubble tea. El acceso desde el sitio público abre el catálogo Angular. Spring Boot expone la API REST, aplica JWT y roles, y guarda los productos en SQL Server mediante JPA.

- [Informe final y sustentación técnica](docs/INFORME_FINAL.md)
- [Guion de demostración con DevTools y SQL Server](docs/DEMOSTRACION_FINAL.md)
- [Avance 2](docs/AVANCE_2.md), con la evidencia histórica del panel anterior.

## Ejecutar en local

Requisitos: Node.js 22.12 o posterior dentro de la serie 22, JDK 17, Maven 3.9 y una instancia accesible de SQL Server.

1. Crea la base `PandaBobbaBD` y configura un usuario con permisos sobre esa base. En una base nueva, Hibernate crea las tablas al arrancar.

   ```sql
   CREATE DATABASE PandaBobbaBD;
   ```

2. Configura las variables en la terminal o el IDE. Los valores de ejemplo de las cuentas se eligen localmente.

   | Variable | Valor |
   | --- | --- |
   | `SPRING_DATASOURCE_URL` | `jdbc:sqlserver://localhost:1433;databaseName=PandaBobbaBD;encrypt=true;trustServerCertificate=true` para desarrollo local |
   | `SPRING_DATASOURCE_USERNAME` | Usuario de SQL Server |
   | `SPRING_DATASOURCE_PASSWORD` | Contraseña de SQL Server |
   | `DEMO_ADMIN_PASSWORD` | Contraseña inicial de `admin` |
   | `DEMO_USER_PASSWORD` | Contraseña inicial de `user` |
   | `PORT` | Puerto del servidor. Valor predeterminado 8080 |

   Las contraseñas iniciales se aplican al crear cada cuenta. Una cuenta existente conserva su contraseña y sus roles. En Bash o zsh usa `export NOMBRE='valor'`. En PowerShell usa `$env:NOMBRE = 'valor'`.

3. Desde la raíz del repositorio, compila Angular y levanta Spring.

   ```bash
   npm --prefix frontend ci
   npm --prefix frontend run build
   mvn spring-boot:run
   ```

4. Abre `http://localhost:8080/app/` o entra en `http://localhost:8080/inicio` y pulsa **Iniciar sesión**. Para desarrollo con recarga automática, ejecuta `npm --prefix frontend start` y usa el puerto 4200. El proxy de desarrollo apunta al backend en 8080.

## Sesión del navegador

El acceso desde `/app/` crea una sesión de hasta ocho horas. Inicio muestra **Sesión activa** con el nombre de la cuenta e **Ir a mi panel**. Cada pestaña nueva valida la sesión con Spring. El interceptor renueva en segundo plano el JWT de 30 minutos al volver a usar el catálogo. La cookie de sesión es HttpOnly, SameSite=Lax y se marca Secure cuando la conexión es HTTPS. Al cerrar sesión, el servidor invalida la sesión y los JWT vinculados a ella.

Spring almacena estas sesiones en memoria. Un reinicio del servidor requiere volver a iniciar sesión. El endpoint `POST /api/auth/login` conserva el contrato Bearer para clientes de la API. Angular usa `/api/session/login`, protegido con CSRF.

## Pruebas

`mvn test` verifica la API con H2, incluido el rollback del lote y los controles JWT. Con Spring en ejecución y las variables de las cuentas disponibles en la terminal, instala Chromium con `npx playwright install chromium` y ejecuta `npm run test:e2e` desde `frontend`. La prueba usa el backend real y, cuando `E2E_SQL_CONTAINER` apunta al contenedor de la base de pruebas, confirma las filas mediante consultas SQL independientes.

El workflow `Angular, Spring Boot y SQL Server` crea una instancia SQL Server temporal, construye la imagen de la aplicación, ejecuta las pruebas Spring y corre el recorrido de Chromium con las comprobaciones SQL activadas.

## Desplegar

El `Dockerfile` compila Angular, lo empaqueta en el JAR de Spring y genera la imagen de ejecución. `railway.toml` configura Railway para construir esa imagen.

```bash
docker build -t panda-bobba .
docker run --rm -p 8080:8080 --env-file .env panda-bobba
```

En Docker, la URL JDBC debe alcanzar SQL Server desde el contenedor. En Railway, configura las mismas variables en el servicio, usa un servidor SQL accesible desde Railway con TLS y un certificado confiable, genera el dominio y abre `/app/`. Utiliza una base de demostración y contraseñas propias para las cuentas de la sustentación.
