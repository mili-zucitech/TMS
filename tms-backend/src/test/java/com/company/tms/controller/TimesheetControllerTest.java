package com.company.tms.controller;

import com.company.tms.exception.ResourceNotFoundException;
import com.company.tms.exception.ValidationException;
import com.company.tms.security.CustomUserDetailsService;
import com.company.tms.security.JwtService;
import com.company.tms.timesheet.dto.TimesheetCreateRequest;
import com.company.tms.timesheet.dto.TimesheetResponse;
import com.company.tms.timesheet.entity.TimesheetStatus;
import com.company.tms.timesheet.exception.InvalidTimesheetStateException;
import com.company.tms.timesheet.service.TimesheetService;
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
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SuppressWarnings("null")
@WebMvcTest(com.company.tms.timesheet.controller.TimesheetController.class)
@Import(SecurityConfig.class)
@DisplayName("TimesheetController Tests")
class TimesheetControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean TimesheetService timesheetService;
    @MockBean UserService userService;
    @MockBean JwtService jwtService;
    @MockBean CustomUserDetailsService customUserDetailsService;

    private UUID userId;
    private TimesheetResponse draftResponse;
    private TimesheetResponse submittedResponse;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        LocalDate weekStart = LocalDate.of(2026, 3, 16);

        draftResponse = TimesheetResponse.builder()
                .id(1L).userId(userId)
                .weekStartDate(weekStart)
                .weekEndDate(weekStart.plusDays(6))
                .status(TimesheetStatus.DRAFT)
                .build();

        submittedResponse = TimesheetResponse.builder()
                .id(1L).userId(userId)
                .weekStartDate(weekStart)
                .weekEndDate(weekStart.plusDays(6))
                .status(TimesheetStatus.SUBMITTED)
                .build();
    }

    @Nested
    @DisplayName("CreateTimesheet")
    class CreateTimesheet {

        @Test
        @WithMockUser(roles = {"EMPLOYEE"})
        @DisplayName("creates timesheet successfully returns 201")
        void createTimesheet_Success_Returns201() throws Exception {
            TimesheetCreateRequest request = new TimesheetCreateRequest(
                    userId, LocalDate.of(2026, 3, 16), LocalDate.of(2026, 3, 22));

            when(timesheetService.createWeeklyTimesheet(any())).thenReturn(draftResponse);

            mockMvc.perform(post("/api/v1/timesheets")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.status").value("DRAFT"))
                    .andExpect(jsonPath("$.message").value("Timesheet created"));
        }

        @Test
        @WithMockUser(roles = {"EMPLOYEE"})
        @DisplayName("missing user ID returns 400")
        void createTimesheet_MissingUserId_Returns400() throws Exception {
            String body = """
                    {
                      "weekStartDate": "2026-03-16",
                      "weekEndDate": "2026-03-22"
                    }
                    """;

            mockMvc.perform(post("/api/v1/timesheets")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errorCode").value("VALIDATION_FAILED"));
        }

        @Test
        @WithMockUser(roles = {"EMPLOYEE"})
        @DisplayName("duplicate week throws 400 validation error")
        void createTimesheet_DuplicateWeek_Returns400() throws Exception {
            TimesheetCreateRequest request = new TimesheetCreateRequest(
                    userId, LocalDate.of(2026, 3, 16), LocalDate.of(2026, 3, 22));

            when(timesheetService.createWeeklyTimesheet(any()))
                    .thenThrow(new ValidationException("A timesheet already exists for this week"));

            mockMvc.perform(post("/api/v1/timesheets")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
        }
    }

    @Nested
    @DisplayName("GetTimesheetById")
    class GetTimesheetById {

        @Test
        @WithMockUser(roles = {"ADMIN"})
        @DisplayName("admin retrieves timesheet by ID returns 200")
        void getTimesheetById_Admin_Returns200() throws Exception {
            when(timesheetService.getTimesheetById(1L)).thenReturn(draftResponse);

            mockMvc.perform(get("/api/v1/timesheets/{id}", 1L))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.id").value(1))
                    .andExpect(jsonPath("$.data.status").value("DRAFT"));
        }

        @Test
        @WithMockUser(roles = {"ADMIN"})
        @DisplayName("non-existent timesheet returns 404")
        void getTimesheetById_NotFound_Returns404() throws Exception {
            when(timesheetService.getTimesheetById(999L))
                    .thenThrow(new ResourceNotFoundException("Timesheet", "id", 999L));

            mockMvc.perform(get("/api/v1/timesheets/{id}", 999L))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.errorCode").value("RESOURCE_NOT_FOUND"));
        }
    }

    @Nested
    @DisplayName("SubmitTimesheet")
    class SubmitTimesheet {

        @Test
        @WithMockUser
        @DisplayName("submit transitions timesheet to SUBMITTED")
        void submitTimesheet_Success_Returns200() throws Exception {
            when(timesheetService.submitTimesheet(1L)).thenReturn(submittedResponse);

            mockMvc.perform(post("/api/v1/timesheets/{id}/submit", 1L))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.status").value("SUBMITTED"))
                    .andExpect(jsonPath("$.message").value("Timesheet submitted successfully"));
        }

        @Test
        @WithMockUser
        @DisplayName("submitting already-approved timesheet returns 422")
        void submitTimesheet_InvalidState_Returns422() throws Exception {
            when(timesheetService.submitTimesheet(3L))
                    .thenThrow(new InvalidTimesheetStateException("Cannot submit APPROVED timesheet"));

            mockMvc.perform(post("/api/v1/timesheets/{id}/submit", 3L))
                    .andExpect(status().isUnprocessableEntity())
                    .andExpect(jsonPath("$.errorCode").value("INVALID_TIMESHEET_STATE"));
        }
    }

    @Nested
    @DisplayName("LockTimesheet")
    class LockTimesheet {

        @Test
        @WithMockUser(roles = {"ADMIN"})
        @DisplayName("ADMIN locks approved timesheet returns 200")
        void lockTimesheet_Admin_Returns200() throws Exception {
            TimesheetResponse lockedResponse = TimesheetResponse.builder()
                    .id(3L).status(TimesheetStatus.LOCKED).build();

            when(timesheetService.lockTimesheet(3L)).thenReturn(lockedResponse);

            mockMvc.perform(post("/api/v1/timesheets/{id}/lock", 3L))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.status").value("LOCKED"))
                    .andExpect(jsonPath("$.message").value("Timesheet locked"));
        }

        @Test
        @WithMockUser(roles = {"EMPLOYEE"})
        @DisplayName("non-ADMIN cannot lock timesheet returns 403")
        void lockTimesheet_NonAdmin_Returns403() throws Exception {
            mockMvc.perform(post("/api/v1/timesheets/{id}/lock", 3L))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"));
        }
    }
}
