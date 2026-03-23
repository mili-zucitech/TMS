package com.company.tms.controller;

import com.company.tms.exception.ResourceNotFoundException;
import com.company.tms.exception.ValidationException;
import com.company.tms.security.CustomUserDetailsService;
import com.company.tms.security.JwtService;
import com.company.tms.user.dto.UserCreateRequest;
import com.company.tms.user.dto.UserResponse;
import com.company.tms.user.dto.UserUpdateRequest;
import com.company.tms.user.entity.EmploymentType;
import com.company.tms.user.entity.RoleName;
import com.company.tms.user.entity.UserStatus;
import com.company.tms.user.service.UserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import com.company.tms.security.SecurityConfig;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(com.company.tms.user.controller.UserController.class)
@Import(SecurityConfig.class)
@DisplayName("UserController Tests")
class UserControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean UserService userService;
    @MockBean JwtService jwtService;
    @MockBean CustomUserDetailsService customUserDetailsService;

    private UUID userId;
    private UserResponse userResponse;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();

        userResponse = UserResponse.builder()
                .id(userId)
                .employeeId("EMP-0001")
                .name("John Doe")
                .email("john.doe@company.com")
                .phone("+1234567890")
                .roleName(RoleName.EMPLOYEE)
                .status(UserStatus.ACTIVE)
                .designation("Software Engineer")
                .employmentType(EmploymentType.FULL_TIME)
                .joiningDate(LocalDate.of(2023, 1, 15))
                .build();
    }

    @Nested
    @DisplayName("GetAllUsers")
    class GetAllUsers {

        @Test
        @WithMockUser
        @DisplayName("authenticated request returns 200 with paginated users")
        void getAllUsers_Authenticated_Returns200() throws Exception {
            Page<UserResponse> page = new PageImpl<>(List.of(userResponse), PageRequest.of(0, 20), 1);
            when(userService.getAllUsers(any())).thenReturn(page);

            mockMvc.perform(get("/api/v1/users"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.content[0].name").value("John Doe"))
                    .andExpect(jsonPath("$.data.content[0].employeeId").value("EMP-0001"));
        }

        @Test
        @DisplayName("unauthenticated request returns 401")
        void getAllUsers_Unauthenticated_Returns401() throws Exception {
            mockMvc.perform(get("/api/v1/users"))
                    .andExpect(status().isUnauthorized());
        }
    }

    @Nested
    @DisplayName("GetUserById")
    class GetUserById {

        @Test
        @WithMockUser(roles = {"ADMIN"})
        @DisplayName("admin can retrieve any user by ID")
        void getUserById_Admin_Returns200() throws Exception {
            when(userService.getUserById(userId)).thenReturn(userResponse);

            mockMvc.perform(get("/api/v1/users/{id}", userId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.id").value(userId.toString()))
                    .andExpect(jsonPath("$.data.name").value("John Doe"));
        }

        @Test
        @WithMockUser(roles = {"ADMIN"})
        @DisplayName("returns 404 when user not found")
        void getUserById_NotFound_Returns404() throws Exception {
            when(userService.getUserById(any()))
                    .thenThrow(new ResourceNotFoundException("User", "id", userId));

            mockMvc.perform(get("/api/v1/users/{id}", userId))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.errorCode").value("RESOURCE_NOT_FOUND"));
        }
    }

    @Nested
    @DisplayName("CreateUser")
    class CreateUser {

        private UserCreateRequest buildValidRequest() {
            UserCreateRequest req = new UserCreateRequest();
            req.setName("Alice Smith");
            req.setEmail("alice.smith@company.com");
            req.setPassword("Secret@1234");
            req.setPhone("+9876543210");
            req.setRoleName(RoleName.EMPLOYEE);
            req.setDesignation("Developer");
            req.setEmploymentType(EmploymentType.FULL_TIME);
            req.setJoiningDate(LocalDate.of(2024, 1, 1));
            return req;
        }

        @Test
        @WithMockUser(roles = {"ADMIN"})
        @DisplayName("ADMIN creates user successfully and returns 201")
        void createUser_Admin_Returns201() throws Exception {
            UserCreateRequest request = buildValidRequest();
            UserResponse created = UserResponse.builder()
                    .id(UUID.randomUUID()).name("Alice Smith")
                    .email("alice.smith@company.com").employeeId("EMP-0002")
                    .roleName(RoleName.EMPLOYEE).status(UserStatus.ACTIVE).build();

            when(userService.createUser(any())).thenReturn(created);

            mockMvc.perform(post("/api/v1/users")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.name").value("Alice Smith"))
                    .andExpect(jsonPath("$.data.employeeId").value("EMP-0002"))
                    .andExpect(jsonPath("$.message").value("User created successfully"));
        }

        @Test
        @WithMockUser(roles = {"HR"})
        @DisplayName("HR creates user successfully")
        void createUser_HR_Returns201() throws Exception {
            when(userService.createUser(any())).thenReturn(userResponse);

            mockMvc.perform(post("/api/v1/users")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(buildValidRequest())))
                    .andExpect(status().isCreated());
        }

        @Test
        @WithMockUser(roles = {"EMPLOYEE"})
        @DisplayName("EMPLOYEE role returns 403 forbidden")
        void createUser_Employee_Returns403() throws Exception {
            mockMvc.perform(post("/api/v1/users")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(buildValidRequest())))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"));
        }

        @Test
        @WithMockUser(roles = {"ADMIN"})
        @DisplayName("missing name returns 400 validation error")
        void createUser_MissingName_Returns400() throws Exception {
            String body = """
                    {
                      "email": "test@company.com",
                      "password": "Secret@1234",
                      "roleName": "EMPLOYEE"
                    }
                    """;

            mockMvc.perform(post("/api/v1/users")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errorCode").value("VALIDATION_FAILED"));
        }

        @Test
        @WithMockUser(roles = {"ADMIN"})
        @DisplayName("invalid email format returns 400")
        void createUser_InvalidEmail_Returns400() throws Exception {
            UserCreateRequest request = buildValidRequest();
            request.setEmail("not-an-email");

            mockMvc.perform(post("/api/v1/users")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errorCode").value("VALIDATION_FAILED"));
        }

        @Test
        @WithMockUser(roles = {"ADMIN"})
        @DisplayName("password too short returns 400")
        void createUser_ShortPassword_Returns400() throws Exception {
            UserCreateRequest request = buildValidRequest();
            request.setPassword("short");

            mockMvc.perform(post("/api/v1/users")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @WithMockUser(roles = {"ADMIN"})
        @DisplayName("duplicate email returns 400 with VALIDATION_ERROR")
        void createUser_DuplicateEmail_Returns400() throws Exception {
            when(userService.createUser(any()))
                    .thenThrow(new ValidationException("Email already exists: alice.smith@company.com"));

            mockMvc.perform(post("/api/v1/users")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(buildValidRequest())))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
        }

        @Test
        @DisplayName("unauthenticated request returns 401")
        void createUser_Unauthenticated_Returns401() throws Exception {
            mockMvc.perform(post("/api/v1/users")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(buildValidRequest())))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @WithMockUser(roles = {"ADMIN"})
        @DisplayName("missing required role returns 400")
        void createUser_MissingRole_Returns400() throws Exception {
            String body = """
                    {
                      "name": "Test User",
                      "email": "test@company.com",
                      "password": "Secret@1234"
                    }
                    """;

            mockMvc.perform(post("/api/v1/users")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("DeactivateUser")
    class DeactivateUser {

        @Test
        @WithMockUser(roles = {"ADMIN"})
        @DisplayName("ADMIN can deactivate user")
        void deactivateUser_Admin_Returns200() throws Exception {
            doNothing().when(userService).deactivateUser(userId);

            mockMvc.perform(delete("/api/v1/users/{id}", userId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("User deactivated successfully"));
        }

        @Test
        @WithMockUser(roles = {"HR"})
        @DisplayName("HR cannot deactivate user returns 403")
        void deactivateUser_HR_Returns403() throws Exception {
            mockMvc.perform(delete("/api/v1/users/{id}", userId))
                    .andExpect(status().isForbidden());
        }
    }

    @Nested
    @DisplayName("UpdateUser")
    class UpdateUser {

        @Test
        @WithMockUser(roles = {"ADMIN"})
        @DisplayName("ADMIN can update user")
        void updateUser_Admin_Returns200() throws Exception {
            UserUpdateRequest request = new UserUpdateRequest();
            request.setName("Updated Name");
            request.setPhone("+1111111111");

            when(userService.updateUser(eq(userId), any())).thenReturn(userResponse);

            mockMvc.perform(put("/api/v1/users/{id}", userId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("User updated successfully"));
        }
    }
}
