package com.company.tms.organization.controller;

import com.company.tms.organization.dto.*;
import com.company.tms.organization.service.DepartmentService;
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
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * /api/v1/departments — full CRUD + member management.
 *
 * <ul>
 *   <li>Read endpoints: all authenticated users (for dropdowns / org chart)</li>
 *   <li>Write / member endpoints: ADMIN and HR_MANAGER only</li>
 * </ul>
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/departments")
@RequiredArgsConstructor
public class DepartmentController {

    private final DepartmentService departmentService;

    // -------------------------------------------------------------------------
    // Read
    // -------------------------------------------------------------------------

    /**
     * GET /api/v1/departments
     * Paged list of all departments (with member count).
     */
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Page<DepartmentDetailResponse>>> getAllDepartments(
            @PageableDefault(size = 20, sort = "name") Pageable pageable) {
        return ResponseEntity.ok(
                ApiResponse.success(departmentService.getAllDepartments(pageable),
                        "Departments retrieved successfully"));
    }

    /**
     * GET /api/v1/departments/{id}
     * Single department with full member list.
     */
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<DepartmentDetailResponse>> getDepartmentById(
            @PathVariable Long id) {
        return ResponseEntity.ok(
                ApiResponse.success(departmentService.getDepartmentById(id),
                        "Department retrieved successfully"));
    }

    /**
     * GET /api/v1/departments/{id}/members
     * List of employees in a department.
     */
    @GetMapping("/{id}/members")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<EmployeeSummaryDTO>>> getDepartmentMembers(
            @PathVariable Long id) {
        return ResponseEntity.ok(
                ApiResponse.success(departmentService.getDepartmentMembers(id),
                        "Department members retrieved successfully"));
    }

    // -------------------------------------------------------------------------
    // Write — ADMIN or HR_MANAGER only
    // -------------------------------------------------------------------------

    /**
     * POST /api/v1/departments
     * Create a new department.
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<ApiResponse<DepartmentDetailResponse>> createDepartment(
            @Valid @RequestBody DepartmentCreateRequest request) {
        DepartmentDetailResponse created = departmentService.createDepartment(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(created, "Department created successfully"));
    }

    /**
     * PUT /api/v1/departments/{id}
     * Update name, description, head or status of a department.
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<ApiResponse<DepartmentDetailResponse>> updateDepartment(
            @PathVariable Long id,
            @Valid @RequestBody DepartmentUpdateRequest request) {
        return ResponseEntity.ok(
                ApiResponse.success(departmentService.updateDepartment(id, request),
                        "Department updated successfully"));
    }

    /**
     * DELETE /api/v1/departments/{id}
     * Delete an empty department (ADMIN only).
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteDepartment(@PathVariable Long id) {
        departmentService.deleteDepartment(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Department deleted successfully"));
    }

    // -------------------------------------------------------------------------
    // Member management — ADMIN or HR_MANAGER
    // -------------------------------------------------------------------------

    /**
     * POST /api/v1/departments/{id}/members
     * Add one or more users to this department.
     */
    @PostMapping("/{id}/members")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<ApiResponse<DepartmentDetailResponse>> addMembers(
            @PathVariable Long id,
            @Valid @RequestBody DepartmentMembersRequest request) {
        return ResponseEntity.ok(
                ApiResponse.success(departmentService.addMembers(id, request),
                        "Members added to department successfully"));
    }

    /**
     * DELETE /api/v1/departments/{id}/members/{userId}
     * Remove a single user from this department.
     */
    @DeleteMapping("/{id}/members/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<ApiResponse<Void>> removeMember(
            @PathVariable Long id,
            @PathVariable UUID userId) {
        departmentService.removeMember(id, userId);
        return ResponseEntity.ok(ApiResponse.success(null, "Member removed from department successfully"));
    }
}

