package com.company.tms.organization.controller;

import com.company.tms.organization.dto.OrganizationDepartmentResponse;
import com.company.tms.organization.service.OrganizationService;
import com.company.tms.util.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/organization")
@RequiredArgsConstructor
public class OrganizationController {

    private final OrganizationService organizationService;

    /**
     * GET /api/v1/organization/departments
     * All departments with their employee lists – org chart view.
     * Accessible by ADMIN, HR and MANAGER.
     */
    @GetMapping("/departments")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR', 'HR_MANAGER', 'MANAGER', 'DIRECTOR')")
    public ResponseEntity<ApiResponse<List<OrganizationDepartmentResponse>>> getDepartmentsWithEmployees() {
        List<OrganizationDepartmentResponse> departments =
                organizationService.getAllDepartmentsWithEmployees();
        return ResponseEntity.ok(
                ApiResponse.success(departments, "Organization retrieved successfully"));
    }
}
