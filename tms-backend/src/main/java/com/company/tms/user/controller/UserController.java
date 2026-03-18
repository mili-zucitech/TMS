package com.company.tms.user.controller;

import com.company.tms.user.dto.UserCreateRequest;
import com.company.tms.user.dto.UserResponse;
import com.company.tms.user.dto.UserUpdateRequest;
import com.company.tms.user.service.UserService;
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

import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    /**
     * Retrieves a paginated list of all users.
     * Accessible by all authenticated users (needed for name lookups in tasks, projects, etc.).
     */
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Page<UserResponse>>> getAllUsers(
            @PageableDefault(size = 20, sort = "name") Pageable pageable) {
        log.debug("GET /api/v1/users - page: {}, size: {}", pageable.getPageNumber(), pageable.getPageSize());
        Page<UserResponse> users = userService.getAllUsers(pageable);
        return ResponseEntity.ok(ApiResponse.success(users, "Users retrieved successfully"));
    }

    /**
     * Retrieves a user by ID.
     * ADMIN, HR, and MANAGER can view any user.
     * EMPLOYEE can only view their own profile.
     */
    @GetMapping("/{id}")
    @PreAuthorize(
            "hasAnyRole('ADMIN', 'HR', 'HR_MANAGER', 'MANAGER', 'DIRECTOR') or " +
            "authentication.name == @userService.getUserEmailById(#id)"
    )
    public ResponseEntity<ApiResponse<UserResponse>> getUserById(@PathVariable UUID id) {
        log.debug("GET /api/v1/users/{}", id);
        UserResponse user = userService.getUserById(id);
        return ResponseEntity.ok(ApiResponse.success(user, "User retrieved successfully"));
    }

    /**
     * Creates a new user.
     * Only ADMIN and HR are authorized.
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HR', 'HR_MANAGER')")
    public ResponseEntity<ApiResponse<UserResponse>> createUser(
            @Valid @RequestBody UserCreateRequest request) {
        log.info("POST /api/v1/users - creating user with email: {}", request.getEmail());
        UserResponse created = userService.createUser(request);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success(created, "User created successfully"));
    }

    /**
     * Updates an existing user.
     * Only ADMIN and HR are authorized.
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR', 'HR_MANAGER')")
    public ResponseEntity<ApiResponse<UserResponse>> updateUser(
            @PathVariable UUID id,
            @Valid @RequestBody UserUpdateRequest request) {
        log.info("PUT /api/v1/users/{}", id);
        UserResponse updated = userService.updateUser(id, request);
        return ResponseEntity.ok(ApiResponse.success(updated, "User updated successfully"));
    }

    /**
     * Deactivates a user (soft delete – sets status to INACTIVE).
     * Only ADMIN is authorized.
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deactivateUser(@PathVariable UUID id) {
        log.info("DELETE /api/v1/users/{}", id);
        userService.deactivateUser(id);
        return ResponseEntity.ok(ApiResponse.success(null, "User deactivated successfully"));
    }

    /**
     * Returns direct reports for a given manager.
     * ADMIN and HR can view any manager's team; any user can view their own direct reports.
     */
    @GetMapping("/team/{managerId}")
    @PreAuthorize(
            "hasAnyRole('ADMIN', 'HR') or " +
            "authentication.name == @userService.getUserEmailById(#managerId)"
    )
    public ResponseEntity<ApiResponse<List<UserResponse>>> getTeamMembers(@PathVariable UUID managerId) {
        log.debug("GET /api/v1/users/team/{}", managerId);
        List<UserResponse> team = userService.getTeamMembers(managerId);
        return ResponseEntity.ok(ApiResponse.success(team, "Team members retrieved successfully"));
    }

    /**
     * Returns all users belonging to the given department.
     * Accessible by all authenticated users (HR/Employee "My Team" view).
     */
    @GetMapping("/department/{departmentId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getDepartmentMembers(@PathVariable Long departmentId) {
        log.debug("GET /api/v1/users/department/{}", departmentId);
        List<UserResponse> members = userService.getDepartmentMembers(departmentId);
        return ResponseEntity.ok(ApiResponse.success(members, "Department members retrieved successfully"));
    }
}

