// *****************************************************************************
//
// Copyright (c) 2015, Southwest Research Institute® (SwRI®)
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//     * Neither the name of Southwest Research Institute® (SwRI®) nor the
//       names of its contributors may be used to endorse or promote products
//       derived from this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED. IN NO EVENT SHALL Southwest Research Institute® BE LIABLE
// FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
// DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
// SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
// CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
// LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY
// OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH
// DAMAGE.
//
// *****************************************************************************

package com.github.swrirobotics.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.hibernate.boot.model.naming.PhysicalNamingStrategyStandardImpl;
import org.h2gis.functions.factory.H2GISDBFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.hibernate.autoconfigure.HibernatePropertiesCustomizer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import javax.sql.DataSource;
import java.sql.SQLException;

@Configuration
public class JpaConfig {
    @Autowired(required = false)
    private DataSourceProperties properties;

    private final Logger myLogger = LoggerFactory.getLogger(JpaConfig.class);

    @Bean
    @Profile("!test")
    public HibernatePropertiesCustomizer hibernatePropertiesCustomizer() {
        return hibernateProperties -> {
            hibernateProperties.put("hibernate.dialect", hibernateDialect());
            hibernateProperties.put("hibernate.physical_naming_strategy", PhysicalNamingStrategyStandardImpl.INSTANCE);
        };
    }

    @Bean
    @Profile("!test")
    public DataSource dataSource() {
        myLogger.info("JDBC driver: " + properties.getDriver());
        myLogger.info("JDBC URL: " + properties.getUrl());
        myLogger.info("JDBC Username: " + properties.getUsername());

        HikariConfig config = new HikariConfig();
        config.setDriverClassName(properties.getDriver());
        config.setJdbcUrl(properties.getUrl());
        config.setUsername(properties.getUsername());
        config.setPassword(properties.getPassword());
        config.addDataSourceProperty("cachePrepStmts", "true");
        config.addDataSourceProperty("prepStmtCacheSize", "250");
        config.addDataSourceProperty("prepStmtCacheSqlLimit", "2048");
        config.addDataSourceProperty("useServerPrepStmts", "true");
        config.addDataSourceProperty("initializationFailTimeout", "10000");

        if (properties.getDriver().equals("org.postgresql.Driver")) {
            return new HikariDataSource(config);
        }
        else {
            try {
                return H2GISDBFactory.createDataSource("testdb", true);
            }
            catch (SQLException e) {
                myLogger.error("Unable to open spatial H2 database.");
                return null;
            }
        }
    }

    private String hibernateDialect() {
        if (properties.getDriver().equals("org.postgresql.Driver")) {
            return "org.hibernate.dialect.PostgreSQLDialect";
        }
        return "org.hibernate.dialect.H2Dialect";
    }

}
