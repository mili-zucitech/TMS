package com.company.tms.integration;

import com.company.tms.auth.dto.LoginRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * End-to-end authentication flow integration test.
 * Uses the Testcontainers MySQL instance configured in {@link AbstractIntegrationTest}.
 * The admin user (admin@tms.com / Admin@123) is seeded by {@code DataInitializer} on startup.
 */
@DisplayName("Auth Flow Integration Tests")
class AuthFlowIntegrationTest extends AbstractIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @Test
    @DisplayName("valid login returns access token")
    void login_ValidCredentials_ReturnsToken() throws Exception {
        LoginRequest request = new LoginRequest("admin@tms.com", "Admin@123");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.data.tokenType").value("Bearer"));
    }

    @Test
    @DisplayName("valid token grants access to protected endpoint")
    void login_ThenAccessProtectedEndpoint_Success() throws Exception {
        LoginRequest request = new LoginRequest("admin@tms.com", "Admin@123");

        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andReturn();

        String responseBody = loginResult.getResponse().getContentAsString();
        String token = objectMapper.readTree(responseBody)
                .at("/data/accessToken").asText();

        assertThat(token).isNotBlank();

        mockMvc.perform(get("/api/v1/users")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("invalid credentials returns 401")
    void login_InvalidCredentials_Returns401() throws Exception {
        LoginRequest request = new LoginRequest("admin@tms.com", "wrongpassword");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("INVALID_CREDENTIALS"));
    }

    @Test
    @DisplayName("accessing protected endpoint without token returns 401")
    void protectedEndpoint_NoToken_Returns401() throws Exception {
        mockMvc.perform(get("/api/v1/users"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("accessing protected endpoint with invalid token returns 401")
    void protectedEndpoint_InvalidToken_Returns401() throws Exception {
        mockMvc.perform(get("/api/v1/users")
                        .header("Authorization", "Bearer totally.invalid.token"))
                .andExpect(status().isUnauthorized());
    }
}

