package com.company.tms.leave.controller;

import com.company.tms.leave.dto.LeaveBalanceResponse;
import com.company.tms.leave.service.LeaveBalanceService;
import com.company.tms.util.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/leave-balances")
@RequiredArgsConstructor
public class LeaveBalanceController {

    private final LeaveBalanceService leaveBalanceService;

    /**
     * Returns leave balances for the current year for a given user.
     */
    @GetMapping("/user/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'MANAGER', 'DIRECTOR') or authentication.name == @userService.getUserEmailById(#userId)")
    public ResponseEntity<ApiResponse<List<LeaveBalanceResponse>>> getUserLeaveBalances(
            @PathVariable UUID userId) {
        log.debug("GET /api/v1/leave-balances/user/{}", userId);
        return ResponseEntity.ok(ApiResponse.success(
                leaveBalanceService.getUserLeaveBalances(userId), "Leave balances retrieved"));
    }

    /**
     * Initialises leave-balance records for every ACTIVE user for the given year.
     * Skips combinations that already exist (idempotent).
     */
    @PostMapping("/initialize/{year}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> initializeLeaveBalances(
            @PathVariable int year) {
        log.info("POST /api/v1/leave-balances/initialize/{}", year);
        int created = leaveBalanceService.initializeLeaveBalancesForYear(year);
        return ResponseEntity.ok(ApiResponse.success(
                Map.of("year", year, "recordsCreated", created),
                created + " leave-balance record(s) created for " + year));
    }
}
