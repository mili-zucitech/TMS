package com.company.tms.report.controller;

import com.company.tms.report.dto.ApprovalTurnaroundReport;
import com.company.tms.report.dto.BillableHoursReport;
import com.company.tms.report.dto.EmployeeHoursReport;
import com.company.tms.report.dto.KpiSummary;
import com.company.tms.report.dto.LeaveReport;
import com.company.tms.report.dto.OvertimeSummaryReport;
import com.company.tms.report.dto.ProjectUtilizationReport;
import com.company.tms.report.dto.TaskSummaryReport;
import com.company.tms.report.dto.TimesheetComplianceReport;
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

    /**
     * GET /api/v1/reports/leave-report
     *
     * Query params (all optional):
     *   startDate   – ISO date (YYYY-MM-DD)
     *   endDate     – ISO date (YYYY-MM-DD)
     *   departmentId
     *   userId      – filter by a specific employee
     *   leaveTypeId – filter by leave type
     *
     * Access: all authenticated users (data is scoped server-side by role).
     */
    @GetMapping("/leave-report")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<LeaveReport>> getLeaveReport(
            Authentication auth,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) UUID userId,
            @RequestParam(required = false) Long leaveTypeId) {

        log.debug("GET /api/v1/reports/leave-report start={} end={} dept={} user={} leaveType={}",
                startDate, endDate, departmentId, userId, leaveTypeId);

        LeaveReport report = reportService.getLeaveReport(
                auth, startDate, endDate, departmentId, userId, leaveTypeId);

        return ResponseEntity.ok(ApiResponse.success(report, "Leave report retrieved"));
    }

    /**
     * GET /api/v1/reports/kpi-summary
     *
     * Query params (all optional): startDate, endDate.
     * Returns aggregated KPI figures (hours, utilization, headcount, project count, pending timesheets).
     *
     * Access: all authenticated users (data is scoped server-side by role).
     */
    @GetMapping("/kpi-summary")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<KpiSummary>> getKpiSummary(
            Authentication auth,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        log.debug("GET /api/v1/reports/kpi-summary start={} end={}", startDate, endDate);

        KpiSummary summary = reportService.getKpiSummary(auth, startDate, endDate);

        return ResponseEntity.ok(ApiResponse.success(summary, "KPI summary retrieved"));
    }

    /**
     * GET /api/v1/reports/overtime-summary
     * Query params: startDate, endDate, departmentId
     * Access: ADMIN, HR, HR_MANAGER, DIRECTOR, MANAGER (team-scoped).
     */
    @GetMapping("/overtime-summary")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR', 'HR_MANAGER', 'DIRECTOR', 'MANAGER')")
    public ResponseEntity<ApiResponse<OvertimeSummaryReport>> getOvertimeSummary(
            Authentication auth,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Long departmentId) {

        log.debug("GET /api/v1/reports/overtime-summary start={} end={} dept={}", startDate, endDate, departmentId);
        OvertimeSummaryReport report = reportService.getOvertimeSummary(auth, startDate, endDate, departmentId);
        return ResponseEntity.ok(ApiResponse.success(report, "Overtime summary retrieved"));
    }

    /**
     * GET /api/v1/reports/timesheet-compliance
     * Query params: startDate, endDate, departmentId
     * Access: ADMIN, HR, HR_MANAGER, DIRECTOR, MANAGER (team-scoped).
     */
    @GetMapping("/timesheet-compliance")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR', 'HR_MANAGER', 'DIRECTOR', 'MANAGER')")
    public ResponseEntity<ApiResponse<TimesheetComplianceReport>> getTimesheetCompliance(
            Authentication auth,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Long departmentId) {

        log.debug("GET /api/v1/reports/timesheet-compliance start={} end={} dept={}", startDate, endDate, departmentId);
        TimesheetComplianceReport report = reportService.getTimesheetCompliance(auth, startDate, endDate, departmentId);
        return ResponseEntity.ok(ApiResponse.success(report, "Timesheet compliance report retrieved"));
    }

    /**
     * GET /api/v1/reports/task-summary
     * Query params: startDate, endDate, projectId
     * Access: ADMIN, HR_MANAGER, DIRECTOR, MANAGER.
     */
    @GetMapping("/task-summary")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'DIRECTOR', 'MANAGER')")
    public ResponseEntity<ApiResponse<TaskSummaryReport>> getTaskSummary(
            Authentication auth,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Long projectId) {

        log.debug("GET /api/v1/reports/task-summary start={} end={} project={}", startDate, endDate, projectId);
        TaskSummaryReport report = reportService.getTaskSummary(auth, startDate, endDate, projectId);
        return ResponseEntity.ok(ApiResponse.success(report, "Task summary report retrieved"));
    }

    /**
     * GET /api/v1/reports/approval-turnaround
     * Query params: startDate, endDate
     * Access: ADMIN, DIRECTOR only.
     */
    @GetMapping("/approval-turnaround")
    @PreAuthorize("hasAnyRole('ADMIN', 'DIRECTOR')")
    public ResponseEntity<ApiResponse<ApprovalTurnaroundReport>> getApprovalTurnaround(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        log.debug("GET /api/v1/reports/approval-turnaround start={} end={}", startDate, endDate);
        ApprovalTurnaroundReport report = reportService.getApprovalTurnaround(startDate, endDate);
        return ResponseEntity.ok(ApiResponse.success(report, "Approval turnaround report retrieved"));
    }
}
