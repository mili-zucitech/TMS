package com.company.tms.config;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Permissive Spring Security configuration for use in tests that do <em>not</em> need to
 * verify authentication or authorisation behaviour.
 *
 * <p>Import this configuration in {@code @WebMvcTest} or {@code @SpringBootTest} classes
 * where you want to focus on business logic and bypass JWT / security filter checks:</p>
 *
 * <pre>{@code
 * @WebMvcTest(MyController.class)
 * @Import(TestSecurityConfig.class)
 * class MyControllerTest { ... }
 * }</pre>
 *
 * <p><strong>Do not</strong> use this in tests that verify security rules
 * (e.g. {@code SecurityConfigTest}, {@code AuthFlowIntegrationTest}).</p>
 *
 * <p>This class is annotated with {@link TestConfiguration} and is therefore only
 * included in an application context when explicitly imported — it is never
 * auto-discovered by component scanning.</p>
 */
@TestConfiguration
public class TestSecurityConfig {

    /**
     * Returns a {@link SecurityFilterChain} that:
     * <ul>
     *   <li>disables CSRF protection (safe for stateless REST test clients)</li>
     *   <li>permits every request without authentication or authorisation checks</li>
     * </ul>
     */
    @Bean
    public SecurityFilterChain testSecurityFilterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
                .build();
    }
}
