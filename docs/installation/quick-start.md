---
layout: default
title: Quick Start
parent: Installation
nav_order: 1
description: "Building and running the Spring Boot Bag Database"
permalink: /installation/quick-start
---

# Quick Start

The current Bag Database architecture runs as a Spring Boot executable JAR. It
does not require an external Tomcat installation.

## Requirements

- JDK 17 or later
- Maven 3.9 or later
- PostgreSQL with PostGIS for persistent deployments
- Docker, if you want to run post-processing scripts or build the container

If no configuration file is present, the application uses an in-memory H2
database and scans `/bags`. That is useful for a smoke test, but data will not be
persistent.

## Build

From the repository root:

```bash
mvn clean package
```

The executable JAR is written to:

```text
target/bag-database-4.0.0-SNAPSHOT.jar
```

## Configure

The application reads its main configuration from:

```text
${HOME}/.ros-bag-database/settings.yml
```

You can override that location with the Spring Boot property
`bag-database.settings-location`. The value must be a URL, usually a `file:`
URL.

Example `settings.yml`:

```yaml
!com.github.swrirobotics.support.web.Configuration
adminPassword: change-me-on-first-login
amapApiKey:
dockerHost:
driver: org.postgresql.Driver
jdbcPassword: letmein
jdbcUrl: jdbc:postgresql://localhost:5432/bag_database
jdbcUsername: bag_database
scriptTmpPath: /scripts
gpsTopics:
    - /gps
metadataTopics:
    - /metadata
vehicleNameTopics:
    - /vehicle_name
storageConfigurations:
    - !com.github.swrirobotics.bags.storage.filesystem.FilesystemBagStorageConfigImpl
        storageId: default
        basePath: /bags
        isLocal: true
        dockerPath: /bags
```

`adminPassword` is consumed on startup to create or update the built-in
`admin` account, then the application clears it from the file when the file is
writable. If it is omitted, a random admin password is printed in the startup
logs.

## Run Locally

```bash
java -jar target/bag-database-4.0.0-SNAPSHOT.jar \
  --bag-database.settings-location=file://${HOME}/.ros-bag-database/settings.yml
```

Open:

```text
http://localhost:8080/
```

If you want to serve the app under a path such as `/bagdb`, use Spring Boot's
standard context path property:

```bash
java -jar target/bag-database-4.0.0-SNAPSHOT.jar \
  --server.servlet.context-path=/bagdb \
  --bag-database.settings-location=file://${HOME}/.ros-bag-database/settings.yml
```

## Run With Docker

Build the local image:

```bash
docker build -f docker/build/Dockerfile -t bag-database:local .
```

Run it with your settings file and bag directory mounted:

```bash
docker run --rm -p 8080:8080 \
  -v "${HOME}/.ros-bag-database/settings.yml:/root/.ros-bag-database/settings.yml" \
  -v "/path/to/bags:/bags" \
  -v "bagdb-indexes:/root/.ros-bag-database/indexes" \
  -v "/tmp/bagdb-scripts:/scripts" \
  bag-database:local
```

Inside the container, the default configuration path is
`/root/.ros-bag-database/settings.yml`.

For a local Compose stack with PostgreSQL and Docker-in-Docker, edit
`docker/build/settings.yml`, make sure `${HOME}/public_html/bags` exists, then
run:

```bash
docker compose -f docker/build/docker-compose.yml up --build
```

For the Webviz Compose stack, build the Bag Database image from this checkout
and start the supporting services with:

```bash
docker compose \
  -f docker/webviz/docker-compose.yml \
  -f docker/webviz/docker-compose.local.yml \
  up --build -d
```

Open the Bag Database management page directly at:

```text
http://localhost:8081/
```

The Traefik route also works when `bagdb.example.com` resolves to your local
machine:

```text
https://bagdb.example.com/
https://bagdb.example.com/webviz/
```

## Useful Links

- [Configuration](../configuration/)
- [Storage Configuration](../configuration/storage)
- [Docker](docker/)
- [Web Interface](../web-interface/web-interface)
- [REST API](../rest-api/)
