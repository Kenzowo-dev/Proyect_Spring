FROM node:22-bookworm-slim AS angular
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM maven:3.9-eclipse-temurin-17 AS spring
WORKDIR /build
COPY pom.xml ./
COPY src/ src/
COPY --from=angular /frontend/dist/catalogo/browser/ frontend/dist/catalogo/browser/
RUN mvn -B package

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=spring /build/target/spring_bobba-0.0.1-SNAPSHOT.jar app.jar
USER 10001
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
