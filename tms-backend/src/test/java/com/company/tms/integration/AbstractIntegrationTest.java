package com.company.tms.integration;

import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Base class for all integration tests.
 * <p>
 * Starts a single MySQL container (shared across all subclasses via the static field),
 * and configures the Spring datasource dynamically via {@link DynamicPropertySource}.
 * </p>
 *
 * <p>Subclasses inherit {@code @SpringBootTest} and {@code @AutoConfigureMockMvc} so
 * they do not need to re-declare these annotations.</p>
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@Testcontainers
class AbstractIntegrationTest {

    @Container
    static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.0")
            .withDatabaseName("tmstest")
            .withUsername("tmsuser")
            .withPassword("tmspass");

    /**
     * Wire the Testcontainers MySQL instance into the Spring datasource
     * before the application context is created.
     */
    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", MYSQL::getJdbcUrl);
        registry.add("spring.datasource.username", MYSQL::getUsername);
        registry.add("spring.datasource.password", MYSQL::getPassword);
        registry.add("spring.datasource.driver-class-name", () -> "com.mysql.cj.jdbc.Driver");
        // Let Hibernate create the schema and Flyway seed the data
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "update");
        registry.add("spring.jpa.properties.hibernate.dialect", () -> "org.hibernate.dialect.MySQLDialect");
        registry.add("spring.flyway.enabled", () -> "true");
        registry.add("spring.flyway.baseline-on-migrate", () -> "true");
        // Disable real SMTP; async mail failures don't affect test outcomes
        registry.add("spring.mail.host", () -> "localhost");
        registry.add("spring.mail.port", () -> "9999");
        registry.add("spring.mail.username", () -> "test@test.com");
        registry.add("spring.mail.password", () -> "test");
    }
}
