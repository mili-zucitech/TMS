package com.company.tms.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

/**
 * Binds {@code cors.*} properties from {@code application.yml} or environment variables.
 *
 * <p>The allowed-origins list is populated from the YAML sequence:
 * <pre>
 * cors:
 *   allowed-origins:
 *     - ${FRONTEND_URL:http://localhost:5173}
 * </pre>
 *
 * <p>Override at runtime by setting the {@code FRONTEND_URL} environment variable.
 * Falls back to {@code http://localhost:5173} when the variable is absent.
 *
 * <p>Wildcard {@code *} is intentionally avoided: Spring Security's CORS support
 * rejects a wildcard origin when {@code allowCredentials} is {@code true}.
 */
@Getter
@Setter
@ConfigurationProperties(prefix = "cors")
public class CorsProperties {

    /**
     * Explicit allowed origins. Populated via {@code cors.allowed-origins} in
     * {@code application.yml}, which in turn resolves {@code FRONTEND_URL}.
     */
    private List<String> allowedOrigins = List.of("http://localhost:5173");
}
