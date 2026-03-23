package com.company.tms.integration;

import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/**
 * Base class for all integration tests.
 * <p>
 * Uses the H2 in-memory database configured in {@code application-test.yml}.
 * Flyway is disabled; Hibernate manages the schema via {@code ddl-auto=update}.
 * </p>
 *
 * <p>Subclasses inherit {@code @SpringBootTest}, {@code @AutoConfigureMockMvc}, and
 * {@code @ActiveProfiles("test")} so they do not need to re-declare these annotations.</p>
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AbstractIntegrationTest {
}
