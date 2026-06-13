package com.company.tms.timesheet.controller;

import com.company.tms.timesheet.dto.TimesheetCreateRequest;
import com.company.tms.timesheet.dto.TimesheetRejectRequest;
import com.company.tms.timesheet.dto.TimesheetResponse;
import com.company.tms.timesheet.dto.TimesheetSubmitRequest;
import com.company.tms.timesheet.service.TimesheetService;
import com.company.tms.util.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/timesheets")
@RequiredArgsConstructor
public class TimesheetController {

    private final TimesheetService timesheetService;

    /** Creates a new DRAFT timesheet for a user's week. */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HR', 'HR_MANAGER', 'MANAGER', 'DIRECTOR', 'EMPLOYEE')")
    public ResponseEntity<ApiResponse<TimesheetResponse>> createTimesheet(
            @Valid @RequestBody TimesheetCreateRequest request) {
        log.debug("POST /api/v1/timesheets");
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(timesheetService.createWeeklyTimesheet(request), "Timesheet created"));
    }

    /** Retrieves a timesheet by its ID. */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR') or @timesheetAccessEvaluator.isOwnerOfTimesheet(authentication.name, #id) or @timesheetAccessEvaluator.isReportingManagerOfTimesheetOwner(authentication.name, #id)")
    public ResponseEntity<ApiResponse<TimesheetResponse>> getTimesheetById(@PathVariable Long id) {
        log.debug("GET /api/v1/timesheets/{}", id);
        return ResponseEntity.ok(ApiResponse.success(timesheetService.getTimesheetById(id), "Timesheet retrieved"));
    }

    /** Returns all timesheets for a given user, optionally filtered by year, month and/or ISO week. */
    @GetMapping("/user/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR', 'HR_MANAGER', 'DIRECTOR') or authentication.name == @userService.getUserEmailById(#userId) or @userService.isReportingManager(authentication.name, #userId)")
    public ResponseEntity<ApiResponse<List<TimesheetResponse>>> getTimesheetsByUser(
            @PathVariable UUID userId,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer week) {
        log.debug("GET /api/v1/timesheets/user/{} year={} month={} week={}", userId, year, month, week);
        List<TimesheetResponse> result = (year != null || month != null || week != null)
                ? timesheetService.getTimesheetsByUserFiltered(userId, year, month, week)
                : timesheetService.getTimesheetsByUser(userId);
        return ResponseEntity.ok(ApiResponse.success(result, "Timesheets retrieved"));
    }

    /** Submits a DRAFT or REJECTED timesheet for approval. */
    @PostMapping("/{id}/submit")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR') or @timesheetAccessEvaluator.isOwnerOfTimesheet(authentication.name, #id)")
    public ResponseEntity<ApiResponse<TimesheetResponse>> submitTimesheet(
            @PathVariable Long id,
            @RequestBody(required = false) TimesheetSubmitRequest request) {
        log.debug("POST /api/v1/timesheets/{}/submit", id);
        return ResponseEntity.ok(ApiResponse.success(
                timesheetService.submitTimesheet(id, request), "Timesheet submitted successfully"));
    }

    /** Approves a SUBMITTED timesheet. MANAGER/ADMIN only. */
    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('ADMIN', 'DIRECTOR') or @timesheetAccessEvaluator.isReportingManagerOfTimesheetOwner(authentication.name, #id)")
    public ResponseEntity<ApiResponse<TimesheetResponse>> approveTimesheet(
            @PathVariable Long id) {
        log.debug("POST /api/v1/timesheets/{}/approve", id);
        return ResponseEntity.ok(ApiResponse.success(
                timesheetService.approveTimesheet(id), "Timesheet approved"));
    }

    /** Rejects a SUBMITTED timesheet with a mandatory reason. MANAGER/ADMIN only. */
    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('ADMIN', 'DIRECTOR') or @timesheetAccessEvaluator.isReportingManagerOfTimesheetOwner(authentication.name, #id)")
    public ResponseEntity<ApiResponse<TimesheetResponse>> rejectTimesheet(
            @PathVariable Long id,
            @Valid @RequestBody TimesheetRejectRequest request) {
        log.debug("POST /api/v1/timesheets/{}/reject", id);
        return ResponseEntity.ok(ApiResponse.success(
                timesheetService.rejectTimesheet(id, request.getRejectionReason()),
                "Timesheet rejected"));
    }

    /** Returns all timesheets for every direct report of the given manager. */
    @GetMapping("/manager/{managerId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR', 'HR_MANAGER', 'DIRECTOR') or authentication.name == @userService.getUserEmailById(#managerId)")
    public ResponseEntity<ApiResponse<List<TimesheetResponse>>> getTeamTimesheets(
            @PathVariable UUID managerId) {
        log.debug("GET /api/v1/timesheets/manager/{}", managerId);
        return ResponseEntity.ok(ApiResponse.success(
                timesheetService.getTimesheetsForTeam(managerId), "Team timesheets retrieved"));
    }

    /** Locks an APPROVED timesheet, preventing any further modifications. ADMIN only. */
    @PostMapping("/{id}/lock")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<TimesheetResponse>> lockTimesheet(@PathVariable Long id) {
        log.debug("POST /api/v1/timesheets/{}/lock", id);
        return ResponseEntity.ok(ApiResponse.success(
                timesheetService.lockTimesheet(id), "Timesheet locked"));
    }
}

