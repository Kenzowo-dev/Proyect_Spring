FROM node:24-alpine AS frontend-build
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build -- --base-href /gestion-catalogo/ --output-path dist/package-build

FROM maven:3.9.9-eclipse-temurin-17 AS backend-build
WORKDIR /build
COPY pom.xml ./
RUN mvn -B -DskipTests dependency:go-offline
COPY src ./src
RUN mvn -B test
COPY --from=frontend-build /frontend/dist/package-build/browser/ ./target/classes/static/gestion-catalogo/
RUN mvn -B package -DskipTests

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=backend-build /build/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
