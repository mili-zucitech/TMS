package com.company.tms.project.controller;

import com.company.tms.project.dto.ProjectCreateRequest;
import com.company.tms.project.dto.ProjectResponse;
import com.company.tms.project.dto.ProjectUpdateRequest;
import com.company.tms.project.service.ProjectService;
import com.company.tms.util.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/v1/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

    /**
     * Returns a paginated list of all projects.
     * Accessible by all authenticated users.
     */
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Page<ProjectResponse>>> getAllProjects(
            @PageableDefault(size = 20, sort = "name") Pageable pageable) {
        log.debug("GET /api/v1/projects");
        Page<ProjectResponse> projects = projectService.getAllProjects(pageable);
        return ResponseEntity.ok(ApiResponse.success(projects, "Projects retrieved successfully"));
    }

    /**
     * Retrieves a single project by ID.
     * Accessible by all authenticated users.
     */
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<ProjectResponse>> getProjectById(@PathVariable Long id) {
        log.debug("GET /api/v1/projects/{}", id);
        ProjectResponse project = projectService.getProjectById(id);
        return ResponseEntity.ok(ApiResponse.success(project, "Project retrieved successfully"));
    }

    /**
     * Creates a new project.
     * Only ADMIN and HR are authorized.
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'MANAGER', 'DIRECTOR')")
    public ResponseEntity<ApiResponse<ProjectResponse>> createProject(
            @Valid @RequestBody ProjectCreateRequest request) {
        log.info("POST /api/v1/projects - creating: {}", request.getName());
        ProjectResponse created = projectService.createProject(request);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success(created, "Project created successfully"));
    }

    /**
     * Updates an existing project.
     * Only ADMIN and HR are authorized.
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR', 'HR_MANAGER', 'MANAGER', 'DIRECTOR')")
    public ResponseEntity<ApiResponse<ProjectResponse>> updateProject(
            @PathVariable Long id,
            @Valid @RequestBody ProjectUpdateRequest request) {
        log.info("PUT /api/v1/projects/{}", id);
        ProjectResponse updated = projectService.updateProject(id, request);
        return ResponseEntity.ok(ApiResponse.success(updated, "Project updated successfully"));
    }

    /**
     * Archives a project (soft-close — sets status to COMPLETED).
     * Only ADMIN is authorized.
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ProjectResponse>> archiveProject(@PathVariable Long id) {
        log.info("DELETE /api/v1/projects/{}", id);
        ProjectResponse archived = projectService.archiveProject(id);
        return ResponseEntity.ok(ApiResponse.success(archived, "Project archived successfully"));
    }
}

