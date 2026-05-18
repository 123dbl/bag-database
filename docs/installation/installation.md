---
layout: default
title: Installation
nav_order: 2
has_children: true
description: "How to install the Bag Database"
permalink: /installation/
---

# Installation

The current Bag Database application is packaged as a Spring Boot executable JAR.
For the normal build, configuration, and Docker workflow, start with
[Quick Start](quick-start).

The Bag Database can also be set up in multiple different ways depending on what
functionality you need; the pages in this category have examples that you can
customize. Some older Docker examples still show environment-variable based
configuration. With the current application, the recommended approach is to
mount or pass a `settings.yml` file.
