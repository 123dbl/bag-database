---
layout: default
title: With Webviz
parent: Docker
grand_parent: Installation
nav_order: 7
description: "Running the Bag Database with a Self-Hosted Webviz Instance behind a Reverse Proxy"
permalink: /installation/docker/with-webviz
---

# With a Self-Hosted Webviz Instance Behind a Reverse Proxy

This is a complex example that incorporates all the smaller subcomponents in the other examples. This is useful for production environments that require the full functionality of the system.

This Bag Database will:
- Use LDAP for authentication
- Run the Bag Database and [Webviz](https://webviz.io/) behind a [Traefik](https://traefik.io/) reverse proxy
- Use Traefik to enforce SSL on all connections
- Automatically generate a signed SSL certificate for `bagdb.example.com` through [Let's Encrypt](https://letsencrypt.org/)
- Use the self-hosted Webviz instance for opening bag files

The three core services are:

- `postgres`: PostGIS database
- `bagdb`: Spring Boot web application that serves the UI and REST API
- `webviz`: self-hosted Webviz visualization UI

The Compose stack also includes support services:

- `traefik`: reverse proxy and TLS termination
- `docker`: Docker-in-Docker service used when Bag Database runs scripts
- `openldap`: LDAP server for this authentication example

The configuration files and Compose files are located [here](../../../docker/webviz/).
Edit them before running a real server so the passwords, domain name, e-mail
address, LDAP settings, and bag storage paths match your environment.

## Start

To run with the published Bag Database image:

```bash
docker compose -f docker/webviz/docker-compose.yml up -d
```

To build and run the local source tree instead:

```bash
docker compose \
  -f docker/webviz/docker-compose.yml \
  -f docker/webviz/docker-compose.local.yml \
  up --build -d
```

The Traefik rules in this example use `bagdb.example.com`. Change that domain in
`docker-compose.yml` and `settings.yml`, or map it to your local machine while
testing.

## Configuration Files

- [settings.yml](https://github.com/swri-robotics/bag-database/blob/master/docker/webviz/settings.yml)
  - Main Bag Database configuration, including database credentials, LDAP settings, ROS topics, storage configuration, and the Webviz "Open With" URL.
- [openldap.env](https://github.com/swri-robotics/bag-database/blob/master/docker/webviz/openldap.env)
   -  Environment variables for the LDAP server.
- [postgres.env](https://github.com/swri-robotics/bag-database/blob/master/docker/webviz/postgres.env)
  - Environment variables for the PostGIS server.
- [webviz-default.conf](https://github.com/swri-robotics/bag-database/blob/master/docker/webviz/webviz-default.conf)
  - A custom configuration file for the Webviz's nginx server.
  - Change the ```location``` variable here because it will be running under an alias at ```/webviz``` in our reverse proxy.
- [docker-compose.yml](https://github.com/swri-robotics/bag-database/blob/master/docker/webviz/docker-compose.yml)
  - Main docker-compose.yml file. If everything is configured correctly, the system can be started with `docker compose -f docker/webviz/docker-compose.yml up -d`.
  - After everything is running, you will be able to access the server at `https://bagdb.example.com`.
- [docker-compose.local.yml](https://github.com/swri-robotics/bag-database/blob/master/docker/webviz/docker-compose.local.yml)
  - Optional override that builds the local source tree as `bag-database:local`.
- [people.ldif](https://github.com/swri-robotics/bag-database/blob/master/docker/webviz/people.ldif)
  - An example LDIF file for creating a "People" group in your LDAP server.
  - After starting the server, run
    
    ```ldapadd -x -D cn=admin,dc=example,dc=com -W -f people.ldif```

    to add this group.
- [user.ldif](https://github.com/swri-robotics/bag-database/blob/master/docker/webviz/user.ldif)
  - An example LDIF file that defines a single user.
  - Customize this for each user
  - After you've added the People group, run
  
    ```ldapadd -x -D cn=admin,dc=example,dc=com -W -f user.ldif```

    to add this person to the server.
