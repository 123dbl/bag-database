FROM maven:3.9-eclipse-temurin-17 AS base-layer

LABEL maintainer="david.anthony@swri.org"
LABEL author="P.J. Reed"

# Build the bag DB in a separate stage so that the final image doesn't need
# to have the maven build environment in it.

WORKDIR /app
COPY pom.xml .
RUN mvn -e -B dependency:resolve
COPY src ./src
RUN mvn -e -B package

FROM eclipse-temurin:17-jre

LABEL maintainer="david.anthony@swri.org"
LABEL author="P.J. Reed"

WORKDIR /app

VOLUME ["/bags", "/root/.ros-bag-database/indexes", "/logs"]
EXPOSE 8080

# Need to manually install ffmpeg and perl for streaming video
RUN apt-get update \
    && apt-get install -y ffmpeg perl \
    && rm -rf /var/lib/apt/lists/*
COPY --from=base-layer /app/target/*.jar /app/bag-database.jar

ENTRYPOINT ["java", "-jar", "/app/bag-database.jar"]
