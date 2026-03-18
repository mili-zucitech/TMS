package com.company.tms.report.controller;

import com.company.tms.report.dto.BillableHoursReport;
import com.company.tms.report.dto.EmployeeHoursReport;
import com.company.tms.report.dto.ProjectUtilizationReport;
import com.company.tms.report.service.ReportService;
import com.company.tms.util.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    /**
     * GET /api/v1/reports/employee-hours
     *
     * Query params (all optional):
     *   startDate    – ISO date (YYYY-MM-DD)
     *   endDate      – ISO date (YYYY-MM-DD)
     *   departmentId – filter by department
     *   userId       – filter by a specific employee (UUID)
     *
     * Access: ADMIN, HR, HR_MANAGER, DIRECTOR → org-wide;
     *         MANAGER → own team;
     *         EMPLOYEE → own records only.
     */
    @GetMapping("/employee-hours")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<EmployeeHoursReport>> getEmployeeHours(
            Authentication auth,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) UUID userId) {

        log.debug("GET /api/v1/reports/employee-hours start={} end={} dept={} user={}",
                startDate, endDate, departmentId, userId);

        EmployeeHoursReport report = reportService.getEmployeeHoursReport(
                auth, startDate, endDate, departmentId, userId);

        return ResponseEntity.ok(ApiResponse.success(report, "Employee hours report retrieved"));
    }

    /**
     * GET /api/v1/reports/project-utilization
     *
     * Query params (all optional):
     *   startDate – ISO date
     *   endDate   – ISO date
     *   projectId – filter by a specific project
     *
     * Access: ADMIN, HR, HR_MANAGER, DIRECTOR, MANAGER only.
     */
    @GetMapping("/project-utilization")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR', 'HR_MANAGER', 'DIRECTOR', 'MANAGER')")
    public ResponseEntity<ApiResponse<ProjectUtilizationReport>> getProjectUtilization(
            Authentication auth,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Long projectId) {

        log.debug("GET /api/v1/reports/project-utilization start={} end={} project={}",
                startDate, endDate, projectId);

        ProjectUtilizationReport report = reportService.getProjectUtilizationReport(
                auth, startDate, endDate, projectId);

        return ResponseEntity.ok(ApiResponse.success(report, "Project utilization report retrieved"));
    }

    /**
     * GET /api/v1/reports/billable-hours
     *
     * Query params (all optional):
     *   startDate – ISO date
     *   endDate   – ISO date
     *   projectId – filter by project
     *   userId    – filter by employee
     *
     * Access: all authenticated users (data is scoped server-side by role).
     */
    @GetMapping("/billable-hours")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<BillableHoursReport>> getBillableHours(
            Authentication auth,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Long projectId,
            @RequestParam(required = false) UUID userId) {

        log.debug("GET /api/v1/reports/billable-hours start={} end={} project={} user={}",
                startDate, endDate, projectId, userId);

        BillableHoursReport report = reportService.getBillableHoursReport(
                auth, startDate, endDate, projectId, userId);

        return ResponseEntity.ok(ApiResponse.success(report, "Billable hours report retrieved"));
    }
}
