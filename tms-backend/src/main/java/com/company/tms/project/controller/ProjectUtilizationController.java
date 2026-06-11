package com.company.tms.project.controller;

import com.company.tms.project.dto.ProjectBreakdownResponse;
import com.company.tms.project.dto.ProjectUtilizationResponse;
import com.company.tms.project.service.ProjectUtilizationService;
import com.company.tms.util.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/v1/projects")
@RequiredArgsConstructor
public class ProjectUtilizationController {

    private final ProjectUtilizationService utilizationService;

    /**
     * Returns a summary of effort utilization and progress for a project.
     * Accessible by all authenticated users.
     *
     * <p>Response includes:
     * <ul>
     *   <li>totalLoggedHours, totalEstimatedHours, utilizationPercentage</li>
     *   <li>completionPercentage (task-based), remainingHours</li>
     *   <li>healthStatus (GREEN / YELLOW / RED / N_A)</li>
     *   <li>timeElapsedPercentage relative to start/end dates</li>
     * </ul>
     */
    @GetMapping("/{id}/utilization")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<ProjectUtilizationResponse>> getUtilization(
            @PathVariable Long id) {
        log.debug("GET /api/v1/projects/{}/utilization", id);
        return ResponseEntity.ok(
                ApiResponse.success(utilizationService.getUtilization(id), "Utilization retrieved"));
    }

    /**
     * Returns the effort breakdown for a project split by user, task and ISO week.
     * Used to populate charts on the utilization dashboard.
     */
    @GetMapping("/{id}/utilization/breakdown")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<ProjectBreakdownResponse>> getBreakdown(
            @PathVariable Long id) {
        log.debug("GET /api/v1/projects/{}/utilization/breakdown", id);
        return ResponseEntity.ok(
                ApiResponse.success(utilizationService.getBreakdown(id), "Breakdown retrieved"));
    }
}
