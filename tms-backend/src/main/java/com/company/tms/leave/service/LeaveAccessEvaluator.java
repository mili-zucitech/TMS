package com.company.tms.leave.service;

import com.company.tms.exception.ResourceNotFoundException;
import com.company.tms.leave.entity.Leave;
import com.company.tms.leave.repository.LeaveRepository;
import com.company.tms.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Authorization helpers for leave endpoints. Kept separate from {@link LeaveService}
 * so {@code @PreAuthorize} SpEL can invoke a real Spring bean in slice tests.
 */
@Component("leaveAccessEvaluator")
@RequiredArgsConstructor
public class LeaveAccessEvaluator {

    private final LeaveRepository leaveRepository;
    private final UserRepository userRepository;

    public boolean isOwnerOfLeave(String userEmail, Long leaveId) {
        try {
            Leave leave = leaveRepository.findById(leaveId)
                    .orElseThrow(() -> new ResourceNotFoundException("LeaveRequest", "id", leaveId));
            return userRepository.findByEmail(userEmail)
                    .map(u -> u.getId().equals(leave.getUserId()))
                    .orElse(false);
        } catch (Exception e) {
            return false;
        }
    }

    public boolean isReportingManagerOfLeave(String managerEmail, Long leaveId) {
        try {
            Leave leave = leaveRepository.findById(leaveId)
                    .orElseThrow(() -> new ResourceNotFoundException("LeaveRequest", "id", leaveId));
            return userRepository.findByEmail(managerEmail)
                    .flatMap(mgr -> userRepository.findById(leave.getUserId())
                            .map(emp -> mgr.getId().equals(emp.getManagerId())))
                    .orElse(false);
        } catch (Exception e) {
            return false;
        }
    }
}
