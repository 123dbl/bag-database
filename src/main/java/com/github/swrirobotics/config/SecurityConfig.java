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

import com.github.swrirobotics.account.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.core.env.Environment;
import org.springframework.ldap.core.support.LdapContextSource;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.ldap.authentication.BindAuthenticator;
import org.springframework.security.ldap.authentication.LdapAuthenticationProvider;
import org.springframework.security.ldap.authentication.LdapAuthenticator;
import org.springframework.security.ldap.ppolicy.PasswordPolicyAwareContextSource;
import org.springframework.security.ldap.userdetails.DefaultLdapAuthoritiesPopulator;
import org.springframework.security.ldap.userdetails.LdapAuthoritiesPopulator;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.access.AccessDeniedHandlerImpl;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.web.csrf.MissingCsrfTokenException;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@EnableWebSecurity
@EnableMethodSecurity(securedEnabled = true)
@Configuration
class SecurityConfig {
    private final ConfigService myConfigService;
    private final Environment myEnvironment;

    private final Logger myLogger = LoggerFactory.getLogger(SecurityConfig.class);

    SecurityConfig(ConfigService myConfigService, Environment myEnvironment) {
        this.myConfigService = myConfigService;
        this.myEnvironment = myEnvironment;
    }

    private static class CsrfAccessDeniedHandler extends AccessDeniedHandlerImpl {
        @Override
        public void handle(HttpServletRequest httpServletRequest, HttpServletResponse httpServletResponse,
                           AccessDeniedException e) throws IOException, ServletException {
            if (e instanceof MissingCsrfTokenException) {
                httpServletResponse.sendError(HttpServletResponse.SC_UNAUTHORIZED);
            } else {
                super.handle(httpServletRequest, httpServletResponse, e);
            }
        }
    }

    @Bean
    public UserService userService() {
        return new UserService();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationSuccessHandler authenticationSuccessHandler() {
        return new AjaxAuthenticationSuccessHandler("/");
    }

    @Bean
    public AuthenticationManager authenticationManager(UserService userService,
                                                       PasswordEncoder passwordEncoder) {
        List<AuthenticationProvider> providers = new ArrayList<>();
        providers.add(daoAuthenticationProvider(userService, passwordEncoder));

        if (isLdapEnabled()) {
            myLogger.info("Enabling LDAP authentication.");
            providers.add(ldapAuthenticationProvider());
        }

        return new ProviderManager(providers);
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http,
                                                   AuthenticationManager authenticationManager,
                                                   AuthenticationSuccessHandler authenticationSuccessHandler)
            throws Exception {
        Set<String> profileSet = activeProfiles();
        myLogger.info("Active profiles: {}", String.join(",", profileSet));
        if (profileSet.contains("test")) {
            // CSRF protection is a pain to work around if we're doing unit tests.
            http.csrf(csrf -> csrf.disable());
        }

        http
            .authenticationManager(authenticationManager)
            .cors(Customizer.withDefaults())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.ALWAYS))
            .exceptionHandling(exceptions -> exceptions.accessDeniedHandler(accessDeniedHandler()))
            // Need to allow same-origin iframes in order for file uploading to work.
            .headers(headers -> headers.frameOptions(frameOptions -> frameOptions.sameOrigin()))
            .authorizeHttpRequests(authorize -> {
                authorize.requestMatchers(
                    "/favicon.ico",
                    "/error",
                    "/generalError",
                    "/resources/**").permitAll();

                if (profileSet.contains("test_ldap") || isLdapEnabled()) {
                    authorize.anyRequest().authenticated();
                }
                else {
                    authorize.requestMatchers(
                        "/",
                        "/bags/**",
                        "/scripts/**",
                        "/register/**",
                        "/status/**").permitAll();
                    authorize.anyRequest().authenticated();
                }
            });

        if (profileSet.contains("test_ldap") || isLdapEnabled()) {
            // If we're running with an LDAP server, redirect to the LDAP login page for anything else
            http
                .formLogin(form -> form
                    .loginPage("/ldap_login")
                    .successHandler(authenticationSuccessHandler)
                    .permitAll())
                .logout(logout -> logout
                    .logoutUrl("/logout")
                    .permitAll()
                    .logoutSuccessUrl("/ldap_login?logout"));
        }
        else {
            // If we're not using LDAP, the only user role is the administrator; unauthenticated
            // users have a larger list they can access
            http
                .formLogin(form -> form
                    .successHandler(authenticationSuccessHandler)
                    .loginPage("/signin")
                    .permitAll())
                .logout(logout -> logout
                    .logoutUrl("/logout")
                    .permitAll()
                    .logoutSuccessUrl("/signin?logout"));
        }

        return http.build();
    }

    private DaoAuthenticationProvider daoAuthenticationProvider(UserService userService,
                                                               PasswordEncoder passwordEncoder) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userService);
        provider.setPasswordEncoder(passwordEncoder);
        return provider;
    }

    @Bean
    @Lazy
    public LdapAuthenticationProvider ldapAuthenticationProvider() {
        return new LdapAuthenticationProvider(ldapAuthenticator(), ldapAuthoritiesPopulator());
    }

    private LdapAuthoritiesPopulator ldapAuthoritiesPopulator() {
        com.github.swrirobotics.support.web.Configuration config = myConfigService.getConfiguration();
        String searchBase = "";
        if (config != null) {
            searchBase = config.getLdapSearchBase();
        }
        myLogger.info("LDAP search base: [{}]", searchBase);
        return new DefaultLdapAuthoritiesPopulator(ldapContextSource(), searchBase);
    }

    @Bean
    @Lazy
    public LdapContextSource ldapContextSource() {
        com.github.swrirobotics.support.web.Configuration config = myConfigService.getConfiguration();
        String ldapProvider = "";
        if (config != null) {
            ldapProvider = config.getLdapServer();
        }
        myLogger.info("LDAP provider: [{}]", ldapProvider);

        if (ldapProvider.isEmpty()) {
            ldapProvider = "ldap://localhost:389/dc=springframework,dc=org";
        }
        PasswordPolicyAwareContextSource contextSource = new PasswordPolicyAwareContextSource(ldapProvider);
        if (config != null) {
            String binddn = config.getLdapBindDn();
            if (!binddn.isEmpty()) {
                contextSource.setUserDn(binddn);
                contextSource.setPassword(myConfigService.getConfiguration().getLdapBindPassword());
            }
        }
        return contextSource;
    }

    @Bean
    @Lazy
    public LdapAuthenticator ldapAuthenticator() {
        BindAuthenticator authenticator = new BindAuthenticator(ldapContextSource());
        com.github.swrirobotics.support.web.Configuration config = myConfigService.getConfiguration();
        String userPattern = "";
        if (config != null) {
            userPattern = config.getLdapUserPattern();
        }
        myLogger.info("LDAP user pattern: [{}]", userPattern);
        authenticator.setUserDnPatterns(new String[]{userPattern});
        return authenticator;
    }

    private AccessDeniedHandler accessDeniedHandler() {
        return new CsrfAccessDeniedHandler();
    }

    private boolean isLdapEnabled() {
        com.github.swrirobotics.support.web.Configuration config = myConfigService.getConfiguration();
        return config != null && config.getLdapServer() != null && !config.getLdapServer().isEmpty();
    }

    private Set<String> activeProfiles() {
        return Arrays.stream(myEnvironment.getActiveProfiles()).collect(Collectors.toSet());
    }
}
