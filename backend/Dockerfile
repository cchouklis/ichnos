# --- Build stage -----------------------------------------------------------
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build
COPY pom.xml .
RUN mvn -B dependency:go-offline
COPY src ./src
RUN mvn -B clean package -DskipTests

# --- Runtime stage -----------------------------------------------------------
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S ichnos && adduser -S ichnos -G ichnos
COPY --from=build /build/target/ichnos-backend-*.jar app.jar
USER ichnos
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
