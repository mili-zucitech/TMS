package com.company.tms.controller;

import com.company.tms.leave.dto.LeaveApproveRequest;
import com.company.tms.leave.dto.LeaveRequestCreateRequest;
import com.company.tms.leave.dto.LeaveRequestResponse;
import com.company.tms.leave.entity.LeaveStatus;
import com.company.tms.leave.exception.InsufficientLeaveBalanceException;
import com.company.tms.leave.service.LeaveService;
import com.company.tms.security.CustomUserDetailsService;
import com.company.tms.security.JwtService;
import com.company.tms.user.service.UserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(com.company.tms.leave.controller.LeaveController.class)
@Import(SecurityConfig.class)
@DisplayName("LeaveController Tests")
class LeaveControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean LeaveService leaveService;
    @MockBean UserService userService;
    @MockBean JwtService jwtService;
    @MockBean CustomUserDetailsService customUserDetailsService;

    private UUID userId;
    private UUID approverId;
    private LeaveRequestResponse pendingLeaveResponse;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        approverId = UUID.randomUUID();

        pendingLeaveResponse = LeaveRequestResponse.builder()
                .id(1L)
                .userId(userId)
                .leaveTypeId(1L)
                .leaveTypeName("Annual Leave")
                .startDate(LocalDate.of(2026, 4, 1))
                .endDate(LocalDate.of(2026, 4, 3))
                .totalDays(3)
                .reason("Personal")
                .status(LeaveStatus.PENDING)
                .build();
    }

    @Nested
    @DisplayName("GetAllLeaves")
    class GetAllLeaves {

        @Test
        @WithMockUser(roles = {"EMPLOYEE"})
        @DisplayName("authenticated EMPLOYEE can retrieve leave list")
        void getAllLeaves_Authenticated_Returns200() throws Exception {
            when(leaveService.getAllLeaveRequests(any(), any()))
                    .thenReturn(List.of(pendingLeaveResponse));

            mockMvc.perform(get("/api/v1/leaves"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data[0].id").value(1))
                    .andExpect(jsonPath("$.data[0].status").value("PENDING"));
        }

        @Test
        @WithMockUser(roles = {"ADMIN"})
        @DisplayName("can filter by status")
        void getAllLeaves_WithStatusFilter_Returns200() throws Exception {
            when(leaveService.getAllLeaveRequests(any(), eq("PENDING")))
                    .thenReturn(List.of(pendingLeaveResponse));

            mockMvc.perform(get("/api/v1/leaves").param("status", "PENDING"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data[0].status").value("PENDING"));
        }
    }

    @Nested
    @DisplayName("CreateLeaveRequest")
    class CreateLeaveRequest {

        private LeaveRequestCreateRequest buildValidRequest() {
            return new LeaveRequestCreateRequest(
                    userId, 1L,
                    LocalDate.of(2026, 4, 1),
                    LocalDate.of(2026, 4, 3),
                    "Annual vacation");
        }

        @Test
        @WithMockUser
        @DisplayName("valid request creates leave and returns 201")
        void createLeave_Valid_Returns201() throws Exception {
            when(leaveService.createLeaveRequest(any())).thenReturn(pendingLeaveResponse);

            mockMvc.perform(post("/api/v1/leaves")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(buildValidRequest())))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.status").value("PENDING"))
                    .andExpect(jsonPath("$.message").value("Leave request submitted"));
        }

        @Test
        @WithMockUser
        @DisplayName("missing userId returns 400")
        void createLeave_MissingUserId_Returns400() throws Exception {
            String body = """
                    {
                      "leaveTypeId": 1,
                      "startDate": "2026-04-01",
                      "endDate": "2026-04-03"
                    }
                    """;

            mockMvc.perform(post("/api/v1/leaves")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errorCode").value("VALIDATION_FAILED"));
        }

        @Test
        @WithMockUser
        @DisplayName("insufficient balance returns 422")
        void createLeave_InsufficientBalance_Returns422() throws Exception {
            when(leaveService.createLeaveRequest(any()))
                    .thenThrow(new InsufficientLeaveBalanceException(
                            "Insufficient leave balance. Requested: 10, Available: 2"));

            mockMvc.perform(post("/api/v1/leaves")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(buildValidRequest())))
                    .andExpect(status().isUnprocessableEntity())
                    .andExpect(jsonPath("$.errorCode").value("INSUFFICIENT_LEAVE_BALANCE"));
        }

        @Test
        @DisplayName("unauthenticated request returns 401")
        void createLeave_Unauthenticated_Returns401() throws Exception {
            mockMvc.perform(post("/api/v1/leaves")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(buildValidRequest())))
                    .andExpect(status().isUnauthorized());
        }
    }

    @Nested
    @DisplayName("ApprovLeave")
    class ApprovLeave {

        @Test
        @WithMockUser(roles = {"MANAGER"})
        @DisplayName("MANAGER can approve leave request")
        void approveLeave_Manager_Returns200() throws Exception {
            LeaveRequestResponse approved = LeaveRequestResponse.builder()
                    .id(1L).userId(userId).status(LeaveStatus.APPROVED)
                    .approvedBy(approverId).build();

            LeaveApproveRequest request = new LeaveApproveRequest(approverId);
            when(leaveService.approveLeaveRequest(eq(1L), any())).thenReturn(approved);

            mockMvc.perform(post("/api/v1/leaves/{id}/approve", 1L)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.status").value("APPROVED"))
                    .andExpect(jsonPath("$.message").value("Leave request approved"));
        }

        @Test
        @WithMockUser(roles = {"EMPLOYEE"})
        @DisplayName("EMPLOYEE cannot approve leave returns 403")
        void approveLeave_Employee_Returns403() throws Exception {
            LeaveApproveRequest request = new LeaveApproveRequest(approverId);

            mockMvc.perform(post("/api/v1/leaves/{id}/approve", 1L)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isForbidden());
        }
    }

    @Nested
    @DisplayName("CancelLeave")
    class CancelLeave {

        @Test
        @WithMockUser
        @DisplayName("authenticated user can cancel own leave")
        void cancelLeave_Authenticated_Returns200() throws Exception {
            LeaveRequestResponse cancelled = LeaveRequestResponse.builder()
                    .id(1L).userId(userId).status(LeaveStatus.CANCELLED).build();

            when(leaveService.cancelLeaveRequest(1L)).thenReturn(cancelled);

            mockMvc.perform(post("/api/v1/leaves/{id}/cancel", 1L))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.status").value("CANCELLED"))
                    .andExpect(jsonPath("$.message").value("Leave request cancelled"));
        }
    }
}
