package com.company.tms.timesheet.controller;

import com.company.tms.timesheet.dto.TimeEntryCreateRequest;
import com.company.tms.timesheet.dto.TimeEntryResponse;
import com.company.tms.timesheet.dto.TimeEntryUpdateRequest;
import com.company.tms.timesheet.service.TimeEntryService;
import com.company.tms.util.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/time-entries")
@RequiredArgsConstructor
public class TimeEntryController {

    private final TimeEntryService timeEntryService;

    /** Logs a new time entry. The parent timesheet must be in DRAFT or REJECTED state. */
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<TimeEntryResponse>> createTimeEntry(
            @Valid @RequestBody TimeEntryCreateRequest request) {
        log.debug("POST /api/v1/time-entries");
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(timeEntryService.createTimeEntry(request), "Time entry created"));
    }

    /** Updates an existing time entry. Full re-validation of overlap and daily limit. */
    @PutMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<TimeEntryResponse>> updateTimeEntry(
            @PathVariable Long id,
            @Valid @RequestBody TimeEntryUpdateRequest request) {
        log.debug("PUT /api/v1/time-entries/{}", id);
        return ResponseEntity.ok(ApiResponse.success(
                timeEntryService.updateTimeEntry(id, request), "Time entry updated"));
    }

    /** Deletes a time entry. The parent timesheet must be editable. */
    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> deleteTimeEntry(@PathVariable Long id) {
        log.debug("DELETE /api/v1/time-entries/{}", id);
        timeEntryService.deleteTimeEntry(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Time entry deleted"));
    }

    /** Returns all time entries belonging to a timesheet. */
    @GetMapping("/timesheet/{timesheetId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<TimeEntryResponse>>> getEntriesByTimesheet(
            @PathVariable Long timesheetId) {
        log.debug("GET /api/v1/time-entries/timesheet/{}", timesheetId);
        return ResponseEntity.ok(ApiResponse.success(
                timeEntryService.getEntriesByTimesheet(timesheetId), "Time entries retrieved"));
    }

    /** Returns all time entries for a user on a specific date. */
    @GetMapping("/user/{userId}/date/{date}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'MANAGER', 'DIRECTOR') or authentication.name == @userService.getUserEmailById(#userId)")
    public ResponseEntity<ApiResponse<List<TimeEntryResponse>>> getEntriesByUserAndDate(
            @PathVariable UUID userId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        log.debug("GET /api/v1/time-entries/user/{}/date/{}", userId, date);
        return ResponseEntity.ok(ApiResponse.success(
                timeEntryService.getEntriesByUserAndDate(userId, date), "Time entries retrieved"));
    }
}
