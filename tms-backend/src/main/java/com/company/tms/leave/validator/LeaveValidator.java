package com.company.tms.leave.validator;

import com.company.tms.exception.ResourceNotFoundException;
import com.company.tms.exception.ValidationException;
import com.company.tms.leave.entity.LeaveBalance;
import com.company.tms.leave.entity.LeaveStatus;
import com.company.tms.leave.exception.InsufficientLeaveBalanceException;
import com.company.tms.leave.exception.LeaveConflictException;
import com.company.tms.leave.exception.LeaveOverlapException;
import com.company.tms.holiday.repository.HolidayRepository;
import com.company.tms.leave.repository.LeaveBalanceRepository;
import com.company.tms.leave.repository.LeaveRepository;
import com.company.tms.leave.repository.LeaveTypeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class LeaveValidator {

    private final LeaveRepository leaveRepository;
    private final LeaveBalanceRepository leaveBalanceRepository;
    private final LeaveTypeRepository leaveTypeRepository;
    private final HolidayRepository holidayRepository;

    /**
     * Validates that a leave type with the given ID exists.
     */
    public void validateLeaveTypeExists(Long leaveTypeId) {
        if (!leaveTypeRepository.existsById(leaveTypeId)) {
            throw new ResourceNotFoundException("LeaveType", "id", leaveTypeId);
        }
    }

    /**
     * Validates that endDate is on or after startDate.
     */
    public void validateDateRange(LocalDate startDate, LocalDate endDate) {
        if (endDate.isBefore(startDate)) {
            throw new ValidationException("End date must be on or after start date.");
        }
    }

    /**
     * Validates that the user has sufficient leave balance for the requested number of days.
     * Uses the current year.
     */
    public void validateSufficientBalance(UUID userId, Long leaveTypeId, int requestedDays) {
        int year = LocalDate.now().getYear();
        LeaveBalance balance = leaveBalanceRepository
                .findByUserIdAndLeaveTypeIdAndYear(userId, leaveTypeId, year)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "LeaveBalance", "userId/leaveTypeId/year",
                        userId + "/" + leaveTypeId + "/" + year));
        if (balance.getRemainingLeaves() < requestedDays) {
            throw new InsufficientLeaveBalanceException(
                    "Insufficient leave balance. Requested: " + requestedDays
                            + ", Available: " + balance.getRemainingLeaves());
        }
    }

    /**
     * Validates that no approved or pending leave request overlaps the given date range for the user.
     * Pass excludeId = -1L for new requests.
     */
    public void validateNoApprovedLeaveOverlap(UUID userId, LocalDate startDate,
                                                LocalDate endDate, Long excludeId) {
        var approvedOverlaps = leaveRepository.findApprovedOverlappingLeaves(
                userId, startDate, endDate, excludeId);
        if (!approvedOverlaps.isEmpty()) {
            throw new LeaveOverlapException(
                    "The requested dates overlap with an existing approved leave (" + startDate + " – " + endDate + ").");
        }
        var pendingOverlaps = leaveRepository.findPendingOverlappingLeaves(
                userId, startDate, endDate, excludeId);
        if (!pendingOverlaps.isEmpty()) {
            throw new LeaveOverlapException(
                    "A leave request for these dates is already pending (" + startDate + " – " + endDate + ").");
        }
    }

    /**
     * Validates that the leave request is in PENDING status, allowing cancellation or approval.
     */
    public void validateLeaveIsPending(LeaveStatus status, Long leaveId) {
        if (status != LeaveStatus.PENDING) {
            throw new ValidationException(
                    "Leave request " + leaveId + " cannot be actioned in status: " + status);
        }
    }

    // -------------------------------------------------------------------------
    // Timesheet integration
    // -------------------------------------------------------------------------

    /**
     * Throws {@link LeaveConflictException} if the user has an approved leave on the given workDate.
     * Called by the Timesheet module before allowing a time entry to be logged.
     */
    public void checkLeaveConflict(UUID userId, LocalDate workDate) {
        if (leaveRepository.existsApprovedLeaveOnDate(userId, workDate)) {
            throw new LeaveConflictException(
                    "User " + userId + " is on approved leave on " + workDate
                            + ". Time entries cannot be logged on leave days.");
        }
    }

    /**
     * Calculates the total number of leave days (inclusive) between startDate and endDate.
     */
    public int calculateTotalDays(LocalDate startDate, LocalDate endDate) {
        long holidayCount = holidayRepository.countByHolidayDateBetween(startDate, endDate);
        return (int) ChronoUnit.DAYS.between(startDate, endDate) + 1 - (int) holidayCount;
    }
}

