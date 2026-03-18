package com.company.tms.leave.controller;

import com.company.tms.leave.dto.LeaveTypeResponse;
import com.company.tms.leave.service.LeaveTypeService;
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
@RequestMapping("/api/v1/leave-types")
@RequiredArgsConstructor
public class LeaveTypeController {

    private final LeaveTypeService leaveTypeService;

    /**
     * Returns all configured leave types.
     */
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<LeaveTypeResponse>>> getAllLeaveTypes() {
        log.debug("GET /api/v1/leave-types");
        return ResponseEntity.ok(ApiResponse.success(
                leaveTypeService.getAllLeaveTypes(), "Leave types retrieved"));
    }
}
