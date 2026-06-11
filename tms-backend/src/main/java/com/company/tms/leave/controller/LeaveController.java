package com.company.tms.leave.controller;

import com.company.tms.leave.dto.LeaveRejectRequest;
import com.company.tms.leave.dto.LeaveRequestCreateRequest;
import com.company.tms.leave.dto.LeaveRequestResponse;
import com.company.tms.leave.service.LeaveService;
import com.company.tms.util.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
@Slf4j
@RestController
@RequestMapping("/api/v1/leaves")
@RequiredArgsConstructor
public class LeaveController {

    private final LeaveService leaveService;

    /**
     * Returns all leave requests (HR / Admin reports endpoint).
     * Optionally filtered by status.
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HR', 'HR_MANAGER', 'DIRECTOR', 'MANAGER', 'EMPLOYEE')")
    public ResponseEntity<ApiResponse<List<LeaveRequestResponse>>> getAllLeaveRequests(
            Authentication auth,
            @RequestParam(required = false) String status) {
        log.debug("GET /api/v1/leaves?status={}", status);
        return ResponseEntity.ok(ApiResponse.success(
                leaveService.getAllLeaveRequests(auth, status), "All leave requests retrieved"));
    }

    /**
     * Creates a new leave request.
     */
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<LeaveRequestResponse>> createLeaveRequest(
            @Valid @RequestBody LeaveRequestCreateRequest request) {
        log.debug("POST /api/v1/leaves");
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(leaveService.createLeaveRequest(request), "Leave request submitted"));
    }

    /**
     * Returns all leave requests for a user.
     */
    @GetMapping("/user/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'DIRECTOR') or authentication.name == @userService.getUserEmailById(#userId) or @userService.isReportingManager(authentication.name, #userId)")
    public ResponseEntity<ApiResponse<List<LeaveRequestResponse>>> getLeaveRequestsByUser(
            @PathVariable UUID userId) {
        log.debug("GET /api/v1/leaves/user/{}", userId);
        return ResponseEntity.ok(ApiResponse.success(
                leaveService.getLeaveRequestsByUser(userId), "Leave requests retrieved"));
    }

    /**
     * Returns all leave requests for direct reportees of the given manager.
     */
    @GetMapping("/manager/{managerId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR', 'HR_MANAGER', 'DIRECTOR') or authentication.name == @userService.getUserEmailById(#managerId)")
    public ResponseEntity<ApiResponse<List<LeaveRequestResponse>>> getTeamLeaveRequests(
            @PathVariable UUID managerId) {
        log.debug("GET /api/v1/leaves/manager/{}", managerId);
        return ResponseEntity.ok(ApiResponse.success(
                leaveService.getLeaveRequestsByManager(managerId), "Team leave requests retrieved"));
    }

    /**
     * Approves a PENDING leave request. MANAGER/ADMIN only.
     */
    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'DIRECTOR') or @leaveService.isReportingManagerOfLeave(authentication.name, #id)")
    public ResponseEntity<ApiResponse<LeaveRequestResponse>> approveLeaveRequest(
            @PathVariable Long id) {
        log.debug("POST /api/v1/leaves/{}/approve", id);
        return ResponseEntity.ok(ApiResponse.success(
                leaveService.approveLeaveRequest(id), "Leave request approved"));
    }

    /**
     * Rejects a PENDING leave request with a mandatory reason. MANAGER/ADMIN only.
     */
    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'DIRECTOR') or @leaveService.isReportingManagerOfLeave(authentication.name, #id)")
    public ResponseEntity<ApiResponse<LeaveRequestResponse>> rejectLeaveRequest(
            @PathVariable Long id,
            @Valid @RequestBody LeaveRejectRequest request) {
        log.debug("POST /api/v1/leaves/{}/reject", id);
        return ResponseEntity.ok(ApiResponse.success(
                leaveService.rejectLeaveRequest(id, request.getRejectionReason()),
                "Leave request rejected"));
    }

    /**
     * Cancels a PENDING leave request.
     */
    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR') or @leaveService.isOwnerOfLeave(authentication.name, #id)")
    public ResponseEntity<ApiResponse<LeaveRequestResponse>> cancelLeaveRequest(@PathVariable Long id) {
        log.debug("POST /api/v1/leaves/{}/cancel", id);
        return ResponseEntity.ok(ApiResponse.success(
                leaveService.cancelLeaveRequest(id), "Leave request cancelled"));
    }
}

