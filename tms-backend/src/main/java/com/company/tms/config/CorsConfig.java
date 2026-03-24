package com.company.tms.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * Centralized CORS configuration.
 *
 * <p>Registers a {@link CorsConfigurationSource} bean that Spring Security picks up
 * automatically when wired via {@code http.cors(cors -> cors.configurationSource(...))}.
 *
 * <p>Key rules:
 * <ul>
 *   <li>Explicit origin list (never {@code *}) — required when
 *       {@code allowCredentials} is {@code true}.</li>
 *   <li>OPTIONS pre-flight requests are covered because Spring Security is
 *       configured to permit them before authentication checks.</li>
 *   <li>Applied to {@code /**} so every path — including those outside
 *       {@code /api/**} — can respond correctly to pre-flight requests.</li>
 * </ul>
 */
@Configuration
@RequiredArgsConstructor
public class CorsConfig {

    /** Injected from {@code cors.allowed-origins} in application.yml. */
    private final CorsProperties corsProperties;

    /**
     * Returns the CORS configuration source used by both Spring MVC and Spring Security.
     *
     * <p>Allowed origins come from {@link CorsProperties#getAllowedOrigins()}, which
     * resolves the {@code FRONTEND_URL} environment variable at startup
     * (fallback: {@code http://localhost:5173}).
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        // Explicit, non-wildcard origins — mandatory when allowCredentials=true.
        // Values resolved from FRONTEND_URL env var (see application.yml).
        config.setAllowedOrigins(corsProperties.getAllowedOrigins());

        config.setAllowedMethods(
                List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(
                List.of("Authorization", "Content-Type", "Accept", "X-Requested-With"));
        config.setExposedHeaders(List.of("Authorization"));

        // Permits the browser to send cookies / Authorization headers cross-origin.
        config.setAllowCredentials(true);

        // Cache pre-flight response for 1 hour to reduce OPTIONS round-trips.
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        // Apply to all paths so pre-flight OPTIONS requests are handled everywhere.
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
