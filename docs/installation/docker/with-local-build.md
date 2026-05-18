---
layout: default
title: With Locally Built Version 
parent: Docker
grand_parent: Installation
nav_order: 8
description: "Running a Locally Built Bag Database Instance"
permalink: /installation/docker/with-local-build
---

# With a Locally Built Bag Database Instance

Sometimes it is convenient for using a locally built version of the Bag Database, without pulling a version from the public docker registry. For instance, this procedure can be used to test local modifications and branches.

To build the bag database from the local source folder, simple run

```bash
docker compose -f docker/build/docker-compose.yml up --build
```

from the root repository of this repository. Note that it is important to do it from the root of the repository because of the context used in the Docker Compose file and the relative file paths accessed in the Dockerfile.

The current image reads `settings.yml` directly. For the most direct local
workflow, see [Quick Start](../quick-start), which shows how to build the image
and mount `${HOME}/.ros-bag-database/settings.yml`.

This Compose example mounts `docker/build/settings.yml` into the container. Edit
that file for your database, bag directory, Docker host, and topic settings.
