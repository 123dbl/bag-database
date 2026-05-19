---
layout: default
title: Configuration
nav_order: 3
has_children: true
description: "Configuring the Bag Database"
permalink: /configuration/
---

# Configuration

The Bag Database stores its configuration in a file at `${HOME}/.ros-bag-database/settings.yml`,
where `${HOME}` is the home directory of the process running the Spring Boot application.
In the Docker image, this defaults to `/root/.ros-bag-database/settings.yml`.

You can use Spring Boot's `bag-database.settings-location` property to point the
application at another file. The value must be a URL, for example
`file:/etc/bag-database/settings.yml`.

Create your own `settings.yml` file for persistent database credentials, storage
backends, map settings, LDAP settings, and script execution paths. If you have
an existing Bag Database, you can use its current configuration as a starting
point by copying `/root/.ros-bag-database/settings.yml` out of the container.

## File Format

For reference, this is what a normal `settings.yml` file looks like:
```yaml
!com.github.swrirobotics.support.web.Configuration
amapApiKey: your-amap-web-service-key
bagPath: /var/local/bags
dockerHost: http://localhost:2375
driver: org.postgresql.Driver
gpsTopics: 
- /localization/gps
- gps
- /vehicle/gps/fix
- /localization/sensors/gps/novatel/raw
- /localization/sensors/gps/novatel/fix
- /imu_3dm_node/gps/fix
- /local_xy_origin
scriptTmpPath: /scripts
jdbcPassword: letmein
jdbcUrl: jdbc:postgresql://localhost/bag_database
jdbcUsername: bag_database
ldapBindDn: cn=admin,dc=example,dc=com
ldapBindPassword: P@ssw0rd
ldapSearchBase: ou=People,dc=example,dc=com
ldapServer: 
ldapUserPattern: uid={0},ou=People,dc=example,dc=com
metadataTopics: 
- /metadata
openWithUrls:
  'Webviz':
      - 'https://webviz.io/app/?'
      - 'remote-bag-url'
      - 'https://bagdb.example.com/'
  'Foxglove Studio':
      - 'https://studio.foxglove.dev/?'
      - 'remote-bag-url'
vehicleNameTopics: 
- /vms/vehicle_name
- /vehicle_name
```



Some of these values can be edited through the
[Configuration](../web-interface/administration#bag-database-configuration)
panel when the application can write to `settings.yml`. If your deployment mounts
the file read-only, edit the file outside the application and restart.

`amapApiKey` is optional. Configure it only if you want Bag Database to resolve
GPS coordinates into human-readable location names through the Amap/Gaode Web
Service reverse geocoding API. Map tiles and trajectory display do not require
this key.
