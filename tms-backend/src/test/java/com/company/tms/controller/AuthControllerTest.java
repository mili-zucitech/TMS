package com.company.tms.controller;

import com.company.tms.auth.dto.LoginRequest;
import com.company.tms.auth.dto.LoginResponse;
import com.company.tms.auth.service.AuthService;
import com.company.tms.security.CustomUserDetailsService;
import com.company.tms.security.SecurityConfig;
import com.company.tms.security.JwtService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(com.company.tms.auth.controller.AuthController.class)
@Import(SecurityConfig.class)
@DisplayName("AuthController Tests")
class AuthControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean AuthService authService;
    @MockBean JwtService jwtService;
    @MockBean CustomUserDetailsService customUserDetailsService;

    @Nested
    @DisplayName("Login")
    class Login {

        @Test
        @DisplayName("successful login returns 200 with access token")
        void login_ValidCredentials_Returns200() throws Exception {
            LoginRequest request = new LoginRequest("admin@tms.com", "Admin@123");
            LoginResponse response = new LoginResponse("eyJhbGciOiJIUzI1NiJ9.test.token");

            when(authService.login(any(LoginRequest.class))).thenReturn(response);

            mockMvc.perform(post("/api/v1/auth/login").with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.accessToken").value("eyJhbGciOiJIUzI1NiJ9.test.token"))
                    .andExpect(jsonPath("$.data.tokenType").value("Bearer"))
                    .andExpect(jsonPath("$.message").value("Login successful"));
        }

        @Test
        @DisplayName("invalid credentials returns 401")
        void login_InvalidCredentials_Returns401() throws Exception {
            LoginRequest request = new LoginRequest("admin@tms.com", "wrongpassword");

            when(authService.login(any(LoginRequest.class)))
                    .thenThrow(new BadCredentialsException("Bad credentials"));

            mockMvc.perform(post("/api/v1/auth/login").with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.errorCode").value("INVALID_CREDENTIALS"));
        }

        @Test
        @DisplayName("missing email returns 400 validation error")
        void login_MissingEmail_Returns400() throws Exception {
            String body = """
                    {
                      "email": "",
                      "password": "Admin@123"
                    }
                    """;

            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.errorCode").value("VALIDATION_FAILED"));
        }

        @Test
        @DisplayName("invalid email format returns 400 validation error")
        void login_InvalidEmailFormat_Returns400() throws Exception {
            String body = """
                    {
                      "email": "not-an-email",
                      "password": "Admin@123"
                    }
                    """;

            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errorCode").value("VALIDATION_FAILED"));
        }

        @Test
        @DisplayName("missing password returns 400 validation error")
        void login_MissingPassword_Returns400() throws Exception {
            String body = """
                    {
                      "email": "admin@tms.com",
                      "password": ""
                    }
                    """;

            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errorCode").value("VALIDATION_FAILED"));
        }

        @Test
        @DisplayName("empty request body returns 400")
        void login_EmptyBody_Returns400() throws Exception {
            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isBadRequest());
        }
    }
}
