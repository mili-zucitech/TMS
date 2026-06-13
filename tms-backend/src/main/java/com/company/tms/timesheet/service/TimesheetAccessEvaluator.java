package com.company.tms.timesheet.service;

import com.company.tms.exception.ResourceNotFoundException;
import com.company.tms.timesheet.entity.Timesheet;
import com.company.tms.timesheet.repository.TimesheetRepository;
import com.company.tms.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Authorization helpers for timesheet endpoints. Kept separate from {@link TimesheetService}
 * so {@code @PreAuthorize} SpEL can invoke a real Spring bean in slice tests.
 */
@Component("timesheetAccessEvaluator")
@RequiredArgsConstructor
public class TimesheetAccessEvaluator {

    private final TimesheetRepository timesheetRepository;
    private final UserRepository userRepository;

    public boolean isOwnerOfTimesheet(String userEmail, Long timesheetId) {
        try {
            Timesheet timesheet = timesheetRepository.findById(timesheetId)
                    .orElseThrow(() -> new ResourceNotFoundException("Timesheet", "id", timesheetId));
            return userRepository.findByEmail(userEmail)
                    .map(u -> u.getId().equals(timesheet.getUserId()))
                    .orElse(false);
        } catch (Exception e) {
            return false;
        }
    }

    public boolean isReportingManagerOfTimesheetOwner(String managerEmail, Long timesheetId) {
        try {
            Timesheet timesheet = timesheetRepository.findById(timesheetId)
                    .orElseThrow(() -> new ResourceNotFoundException("Timesheet", "id", timesheetId));
            return userRepository.findById(timesheet.getUserId())
                    .flatMap(employee -> userRepository.findByEmail(managerEmail)
                            .map(manager -> manager.getId().equals(employee.getManagerId())))
                    .orElse(false);
        } catch (Exception e) {
            return false;
        }
    }
}
