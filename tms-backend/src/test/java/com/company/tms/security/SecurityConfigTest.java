package com.company.tms.security;

import com.company.tms.auth.dto.LoginRequest;
import com.company.tms.auth.service.AuthService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Tests that verify the Spring Security configuration:
 * - Public endpoints are accessible without authentication
 * - Protected endpoints require a valid JWT (or mock user)
 * - Unauthenticated access returns 401
 * - Forbidden access returns 403
 */
@WebMvcTest(com.company.tms.auth.controller.AuthController.class)
@Import(com.company.tms.security.SecurityConfig.class)
@DisplayName("SecurityConfig Tests")
class SecurityConfigTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean AuthService authService;
    @MockBean JwtService jwtService;
    @MockBean CustomUserDetailsService customUserDetailsService;

    // -------------------------------------------------------------------------
    // Public endpoints
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("POST /api/v1/auth/login is publicly accessible (no 401 even for bad body)")
    void publicEndpoint_LoginUrl_IsAccessible() throws Exception {
        when(authService.login(any()))
                .thenThrow(new org.springframework.security.authentication.BadCredentialsException("bad"));

        LoginRequest req = new LoginRequest("x@x.com", "wrong");
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                // We expect 401 from GlobalExceptionHandler (bad credentials), NOT from Spring Security's
                // authenticationEntryPoint (which would also return 401 but with different body)
                // The important thing: the endpoint IS reached (not blocked at security layer).
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("INVALID_CREDENTIALS"));
    }

    // -------------------------------------------------------------------------
    // Protected endpoints - unauthenticated
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("GET protected endpoint without auth returns 401")
    void protectedEndpoint_NoAuth_Returns401() throws Exception {
        mockMvc.perform(get("/api/v1/users"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("UNAUTHORIZED"));
    }

    @Test
    @DisplayName("GET protected endpoint with invalid Bearer token returns 401")
    void protectedEndpoint_InvalidBearerToken_Returns401() throws Exception {
        // JwtService mock returns null by default → filter won't set security context → 401
        mockMvc.perform(get("/api/v1/users")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer invalid.token.value"))
                .andExpect(status().isUnauthorized());
    }

    // -------------------------------------------------------------------------
    // CORS headers
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("OPTIONS preflight request to allowed origin returns 200 with CORS headers")
    void cors_PreflightRequest_Returns200() throws Exception {
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .options("/api/v1/auth/login")
                        .header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "POST")
                        .header("Access-Control-Request-Headers", "Content-Type,Authorization"))
                .andExpect(status().isOk());
    }

    // -------------------------------------------------------------------------
    // CSRF disabled
    // -------------------------------------------------------------------------

    @Test
    @WithMockUser
    @DisplayName("POST request without CSRF token is accepted (CSRF disabled)")
    void csrfDisabled_PostWithoutToken_Accepted() throws Exception {
        // Because CSRF is disabled, posting without X-CSRF-TOKEN header should not result in 403
        when(authService.login(any())).thenReturn(new com.company.tms.auth.dto.LoginResponse("token"));

        LoginRequest req = new LoginRequest("admin@tms.com", "Admin@123");
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());
    }

    // -------------------------------------------------------------------------
    // Role-based access (using @WithMockUser)
    // -------------------------------------------------------------------------

    @Test
    @WithMockUser(roles = {"EMPLOYEE"})
    @DisplayName("EMPLOYEE role on auth endpoint returns 200")
    void withEmployeeRole_OnAuthEndpoint_Returns200() throws Exception {
        when(authService.login(any())).thenReturn(new com.company.tms.auth.dto.LoginResponse("token"));

        LoginRequest req = new LoginRequest("emp@tms.com", "Pass@1234");
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Unauthenticated request to non-existing protected path returns 401")
    void unauthenticated_ProtectedPath_Returns401() throws Exception {
        mockMvc.perform(get("/api/v1/timesheets/1"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Malformed Authorization header (no Bearer prefix) returns 401")
    void malformedAuthHeader_Returns401() throws Exception {
        mockMvc.perform(get("/api/v1/users")
                        .header(HttpHeaders.AUTHORIZATION, "Basic dXNlcjpwYXNz"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Session management is STATELESS — no JSESSION cookie issued")
    void statelessSession_NoJSessionCookie() throws Exception {
        mockMvc.perform(get("/api/v1/users"))
                .andExpect(header().doesNotExist("Set-Cookie"));
    }
}
