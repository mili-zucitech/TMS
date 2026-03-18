package com.company.tms.task.controller;

import com.company.tms.task.dto.TaskCreateRequest;
import com.company.tms.task.dto.TaskResponse;
import com.company.tms.task.dto.TaskStatusUpdateRequest;
import com.company.tms.task.dto.TaskUpdateRequest;
import com.company.tms.task.service.TaskService;
import com.company.tms.user.repository.UserRepository;
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
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;
    private final UserRepository userRepository;

    /**
     * Returns a paginated list of tasks, scoped by the caller's role:
     * - EMPLOYEE : only tasks assigned to them
     * - MANAGER  : only tasks they created
     * - ADMIN/HR : all tasks
     */
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Page<TaskResponse>>> getAllTasks(
            Authentication authentication,
            @PageableDefault(size = 20, sort = "title") Pageable pageable) {
        log.debug("GET /api/v1/tasks");
        java.util.Set<String> authorities = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(java.util.stream.Collectors.toSet());
        boolean isEmployee  = authorities.contains("ROLE_EMPLOYEE");
        boolean isCreatorFl = authorities.contains("ROLE_MANAGER") || authorities.contains("ROLE_HR_MANAGER");
        if (isEmployee) {
            return ResponseEntity.ok(ApiResponse.success(
                    taskService.getTasksForCurrentUser(authentication.getName(), pageable),
                    "Tasks retrieved successfully"));
        }
        if (isCreatorFl) {
            return ResponseEntity.ok(ApiResponse.success(
                    taskService.getTasksCreatedByUser(authentication.getName(), pageable),
                    "Tasks retrieved successfully"));
        }
        // ADMIN, HR, DIRECTOR — see all tasks
        return ResponseEntity.ok(ApiResponse.success(taskService.getAllTasks(pageable), "Tasks retrieved successfully"));
    }

    /**
     * Retrieves a task by ID.
     */
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<TaskResponse>> getTaskById(@PathVariable Long id) {
        log.debug("GET /api/v1/tasks/{}", id);
        return ResponseEntity.ok(ApiResponse.success(taskService.getTaskById(id), "Task retrieved successfully"));
    }

    /**
     * Returns all tasks for a project.
     */
    @GetMapping("/project/{projectId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<TaskResponse>>> getTasksByProject(@PathVariable Long projectId) {
        log.debug("GET /api/v1/tasks/project/{}", projectId);
        return ResponseEntity.ok(ApiResponse.success(
                taskService.getTasksByProject(projectId), "Tasks retrieved successfully"));
    }

    /**
     * Returns all tasks assigned to a user.
     */
    @GetMapping("/user/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'MANAGER', 'DIRECTOR') or authentication.name == @userService.getUserEmailById(#userId)")
    public ResponseEntity<ApiResponse<List<TaskResponse>>> getTasksByUser(@PathVariable UUID userId) {
        log.debug("GET /api/v1/tasks/user/{}", userId);
        return ResponseEntity.ok(ApiResponse.success(
                taskService.getTasksByUser(userId), "Tasks retrieved successfully"));
    }

    /**
     * Creates a new task. Only ADMIN and MANAGER are authorized.
     * Records the authenticated user as the creator.
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'MANAGER', 'DIRECTOR')")
    public ResponseEntity<ApiResponse<TaskResponse>> createTask(
            Authentication authentication,
            @Valid @RequestBody TaskCreateRequest request) {
        log.info("POST /api/v1/tasks - creating: {}", request.getTitle());
        UUID creatorId = userRepository.findByEmail(authentication.getName())
                .map(u -> u.getId())
                .orElse(null);
        TaskResponse created = taskService.createTask(request, creatorId);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success(created, "Task created successfully"));
    }

    /**
     * Updates an existing task. Only ADMIN and MANAGER are authorized.
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'MANAGER', 'DIRECTOR')")
    public ResponseEntity<ApiResponse<TaskResponse>> updateTask(
            @PathVariable Long id,
            @Valid @RequestBody TaskUpdateRequest request) {
        log.info("PUT /api/v1/tasks/{}", id);
        return ResponseEntity.ok(ApiResponse.success(taskService.updateTask(id, request), "Task updated successfully"));
    }

    /**
     * Updates only the status of a task. ADMIN, MANAGER, and the assigned EMPLOYEE can update status.
     */
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'MANAGER', 'DIRECTOR', 'EMPLOYEE')")
    public ResponseEntity<ApiResponse<TaskResponse>> updateTaskStatus(
            @PathVariable Long id,
            @Valid @RequestBody TaskStatusUpdateRequest request) {
        log.info("PATCH /api/v1/tasks/{}/status -> {}", id, request.getStatus());
        return ResponseEntity.ok(ApiResponse.success(
                taskService.updateTaskStatus(id, request.getStatus()), "Task status updated successfully"));
    }

    /**
     * Permanently deletes a task. Only ADMIN is authorized.
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteTask(@PathVariable Long id) {
        log.info("DELETE /api/v1/tasks/{}", id);
        taskService.deleteTask(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Task deleted successfully"));
    }
}

