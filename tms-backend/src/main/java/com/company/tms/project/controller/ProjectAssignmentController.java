package com.company.tms.project.controller;

import com.company.tms.project.dto.ProjectAssignmentRequest;
import com.company.tms.project.dto.ProjectAssignmentResponse;
import com.company.tms.project.service.ProjectAssignmentService;
import com.company.tms.util.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/project-assignments")
@RequiredArgsConstructor
public class ProjectAssignmentController {

    private final ProjectAssignmentService assignmentService;

    /**
     * Assigns a user to a project.
     * ADMIN, HR, and MANAGER are authorized.
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HR', 'HR_MANAGER', 'MANAGER', 'DIRECTOR')")
    public ResponseEntity<ApiResponse<ProjectAssignmentResponse>> assignUserToProject(
            @Valid @RequestBody ProjectAssignmentRequest request) {
        log.info("POST /api/v1/project-assignments - userId: {}, projectId: {}",
                request.getUserId(), request.getProjectId());
        ProjectAssignmentResponse created = assignmentService.assignUserToProject(request);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success(created, "User assigned to project successfully"));
    }

    /**
     * Removes a project assignment by its ID.
     * ADMIN, HR, and MANAGER are authorized.
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR', 'HR_MANAGER', 'MANAGER', 'DIRECTOR')")
    public ResponseEntity<ApiResponse<Void>> removeAssignment(@PathVariable Long id) {
        log.info("DELETE /api/v1/project-assignments/{}", id);
        assignmentService.removeUserFromProject(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Assignment removed successfully"));
    }

    /**
     * Returns all projects a given user is assigned to.
     * ADMIN, HR, MANAGER can query any user.
     * An EMPLOYEE can query their own assignments only (enforced by the service contract;
     * fine-grained EMPLOYEE self-check is applied at the security layer via a SpEL expression
     * comparing the principal to the requested userId).
     */
    @GetMapping("/user/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR', 'HR_MANAGER', 'MANAGER', 'DIRECTOR') or authentication.name == @userService.getUserEmailById(#userId)")
    public ResponseEntity<ApiResponse<List<ProjectAssignmentResponse>>> getProjectsByUser(
            @PathVariable UUID userId) {
        log.debug("GET /api/v1/project-assignments/user/{}", userId);
        List<ProjectAssignmentResponse> assignments = assignmentService.getProjectsByUser(userId);
        return ResponseEntity.ok(ApiResponse.success(assignments, "Assignments retrieved successfully"));
    }

    /**
     * Returns all users assigned to a given project.
     * Accessible by ADMIN, HR, and MANAGER.
     */
    @GetMapping("/project/{projectId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR', 'HR_MANAGER', 'MANAGER', 'DIRECTOR')")
    public ResponseEntity<ApiResponse<List<ProjectAssignmentResponse>>> getUsersByProject(
            @PathVariable Long projectId) {
        log.debug("GET /api/v1/project-assignments/project/{}", projectId);
        List<ProjectAssignmentResponse> assignments = assignmentService.getUsersByProject(projectId);
        return ResponseEntity.ok(ApiResponse.success(assignments, "Assignments retrieved successfully"));
    }
}
