package com.company.tms.project;

import com.company.tms.exception.ResourceNotFoundException;
import com.company.tms.project.controller.ProjectUtilizationController;
import com.company.tms.project.dto.ProjectBreakdownResponse;
import com.company.tms.project.dto.ProjectUtilizationResponse;
import com.company.tms.project.service.ProjectUtilizationService;
import com.company.tms.security.CustomUserDetailsService;
import com.company.tms.security.JwtService;
import com.company.tms.security.SecurityConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SuppressWarnings("null")
@WebMvcTest(ProjectUtilizationController.class)
@Import(SecurityConfig.class)
@DisplayName("ProjectUtilizationController Tests")
class ProjectUtilizationControllerTest {

    @Autowired MockMvc mockMvc;

    @MockBean ProjectUtilizationService utilizationService;
    @MockBean JwtService                jwtService;
    @MockBean CustomUserDetailsService  customUserDetailsService;

    private ProjectUtilizationResponse utilizationResponse;
    private ProjectBreakdownResponse   breakdownResponse;

    @BeforeEach
    void setUp() {
        utilizationResponse = ProjectUtilizationResponse.builder()
                .projectId(1L)
                .projectName("Test Project")
                .projectStatus("ACTIVE")
                .totalLoggedHours(12.0)
                .totalEstimatedHours(60.0)
                .utilizationPercentage(20.0)
                .completionPercentage(50.0)
                .remainingHours(48.0)
                .healthStatus("GREEN")
                .totalTasks(2)
                .completedTasks(1)
                .timeElapsedPercentage(25.0)
                .build();

        breakdownResponse = ProjectBreakdownResponse.builder()
                .projectId(1L)
                .hoursByUser(List.of())
                .hoursByTask(List.of())
                .hoursByWeek(List.of())
                .build();
    }

    @Nested
    @DisplayName("GET /api/v1/projects/{id}/utilization")
    class GetUtilization {

        @Test
        @WithMockUser
        @DisplayName("returns utilization summary for valid project")
        void getUtilization_ValidProject_Returns200() throws Exception {
            when(utilizationService.getUtilization(1L)).thenReturn(utilizationResponse);

            mockMvc.perform(get("/api/v1/projects/{id}/utilization", 1L))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.projectId").value(1))
                    .andExpect(jsonPath("$.data.totalLoggedHours").value(12.0))
                    .andExpect(jsonPath("$.data.utilizationPercentage").value(20.0))
                    .andExpect(jsonPath("$.data.healthStatus").value("GREEN"))
                    .andExpect(jsonPath("$.data.completionPercentage").value(50.0))
                    .andExpect(jsonPath("$.message").value("Utilization retrieved"));
        }

        @Test
        @WithMockUser
        @DisplayName("returns 404 for non-existent project")
        void getUtilization_UnknownProject_Returns404() throws Exception {
            when(utilizationService.getUtilization(999L))
                    .thenThrow(new ResourceNotFoundException("Project", "id", 999L));

            mockMvc.perform(get("/api/v1/projects/{id}/utilization", 999L))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.errorCode").value("RESOURCE_NOT_FOUND"));
        }

        @Test
        @DisplayName("returns 401 for unauthenticated request")
        void getUtilization_Unauthenticated_Returns401() throws Exception {
            mockMvc.perform(get("/api/v1/projects/{id}/utilization", 1L))
                    .andExpect(status().isUnauthorized());
        }
    }

    @Nested
    @DisplayName("GET /api/v1/projects/{id}/utilization/breakdown")
    class GetBreakdown {

        @Test
        @WithMockUser
        @DisplayName("returns breakdown for valid project")
        void getBreakdown_ValidProject_Returns200() throws Exception {
            when(utilizationService.getBreakdown(1L)).thenReturn(breakdownResponse);

            mockMvc.perform(get("/api/v1/projects/{id}/utilization/breakdown", 1L))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.projectId").value(1))
                    .andExpect(jsonPath("$.data.hoursByUser").isArray())
                    .andExpect(jsonPath("$.data.hoursByTask").isArray())
                    .andExpect(jsonPath("$.data.hoursByWeek").isArray())
                    .andExpect(jsonPath("$.message").value("Breakdown retrieved"));
        }

        @Test
        @WithMockUser
        @DisplayName("returns 404 for non-existent project")
        void getBreakdown_UnknownProject_Returns404() throws Exception {
            when(utilizationService.getBreakdown(999L))
                    .thenThrow(new ResourceNotFoundException("Project", "id", 999L));

            mockMvc.perform(get("/api/v1/projects/{id}/utilization/breakdown", 999L))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.errorCode").value("RESOURCE_NOT_FOUND"));
        }
    }
}
