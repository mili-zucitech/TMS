package com.company.tms.timesheet.validator;

import com.company.tms.exception.ValidationException;
import com.company.tms.project.repository.ProjectAssignmentRepository;
import com.company.tms.timesheet.entity.Timesheet;
import com.company.tms.timesheet.entity.TimesheetStatus;
import com.company.tms.timesheet.exception.InvalidTimesheetStateException;
import com.company.tms.timesheet.exception.TimeOverlapException;
import com.company.tms.timesheet.exception.TimesheetLockedException;
import com.company.tms.timesheet.repository.TimeEntryRepository;
import com.company.tms.timesheet.repository.TimesheetRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class TimesheetValidator {

    private static final int MAX_DAILY_MINUTES = 24 * 60;

    private final TimesheetRepository timesheetRepository;
    private final TimeEntryRepository timeEntryRepository;
    private final ProjectAssignmentRepository projectAssignmentRepository;

    /**
     * Ensures a user doesn't already have a timesheet for the given week start date.
     */
    public void validateNoDuplicateTimesheetForWeek(UUID userId, LocalDate weekStartDate) {
        if (timesheetRepository.findByUserIdAndWeekStartDate(userId, weekStartDate).isPresent()) {
            throw new ValidationException(
                    "A timesheet already exists for user " + userId + " for week starting " + weekStartDate);
        }
    }

    /**
     * Ensures the timesheet is in an editable state (DRAFT or REJECTED).
     * Throws TimesheetLockedException for SUBMITTED or LOCKED states.
     */
    public void validateTimesheetIsEditable(Timesheet timesheet) {
        TimesheetStatus status = timesheet.getStatus();
        if (status == TimesheetStatus.SUBMITTED || status == TimesheetStatus.LOCKED) {
            throw new TimesheetLockedException(
                    "Timesheet " + timesheet.getId() + " cannot be modified in status: " + status);
        }
    }

    /**
     * Ensures a timesheet has at least one time entry before submission.
     */
    public void validateTimesheetHasEntries(Long timesheetId) {
        if (!timeEntryRepository.existsByTimesheetId(timesheetId)) {
            throw new ValidationException(
                    "Timesheet " + timesheetId + " has no time entries. Add at least one entry before submitting.");
        }
    }

    /**
     * Ensures the timesheet is in DRAFT or REJECTED state before submission.
     */
    public void validateTimesheetCanBeSubmitted(Timesheet timesheet) {
        if (timesheet.getStatus() != TimesheetStatus.DRAFT
                && timesheet.getStatus() != TimesheetStatus.REJECTED) {
            throw new InvalidTimesheetStateException(
                    "Timesheet can only be submitted from DRAFT or REJECTED state. Current: "
                            + timesheet.getStatus());
        }
    }

    /**
     * Ensures the timesheet is in SUBMITTED state before approval or rejection.
     */
    public void validateTimesheetCanBeApproved(Timesheet timesheet) {
        if (timesheet.getStatus() != TimesheetStatus.SUBMITTED) {
            throw new InvalidTimesheetStateException(
                    "Timesheet can only be approved/rejected from SUBMITTED state. Current: "
                            + timesheet.getStatus());
        }
    }

    /**
     * Ensures the timesheet is in APPROVED state before locking.
     */
    public void validateTimesheetCanBeLocked(Timesheet timesheet) {
        if (timesheet.getStatus() != TimesheetStatus.APPROVED) {
            throw new InvalidTimesheetStateException(
                    "Timesheet can only be locked from APPROVED state. Current: " + timesheet.getStatus());
        }
    }

    /**
     * Validates that the user is assigned to the given project.
     */
    public void validateUserAssignedToProject(UUID userId, Long projectId) {
        if (!projectAssignmentRepository.existsByUserIdAndProjectId(userId, projectId)) {
            throw new ValidationException(
                    "User " + userId + " is not assigned to project " + projectId);
        }
    }

    /**
     * Validates that endTime is strictly after startTime.
     */
    public void validateEndTimeAfterStartTime(LocalTime startTime, LocalTime endTime) {
        if (!endTime.isAfter(startTime)) {
            throw new ValidationException("End time must be after start time.");
        }
    }

    /**
     * Checks for overlapping time entries for the same user on the same date.
     * Pass excludeEntryId = -1L for a new entry (no existing entry to exclude).
     */
    public void validateNoTimeOverlap(UUID userId, LocalDate workDate,
                                      LocalTime startTime, LocalTime endTime,
                                      Long excludeEntryId) {
        var overlaps = timeEntryRepository.findOverlappingEntries(
                userId, workDate, startTime, endTime, excludeEntryId);
        if (!overlaps.isEmpty()) {
            throw new TimeOverlapException(
                    "Time overlap detected for user " + userId + " on " + workDate
                            + " between " + startTime + " and " + endTime);
        }
    }

    /**
     * Validates that adding a new duration does not push the daily total over 24 hours.
     * Pass excludeEntryId = -1L for a new entry.
     */
    public void validateDailyLimitNotExceeded(UUID userId, LocalDate workDate,
                                               int newDurationMinutes, Long excludeEntryId) {
        int existingMinutes = timeEntryRepository.sumDurationMinutesByUserAndWorkDate(
                userId, workDate, excludeEntryId);
        if (existingMinutes + newDurationMinutes > MAX_DAILY_MINUTES) {
            throw new ValidationException(
                    "Total working hours for " + workDate + " would exceed 24 hours.");
        }
    }
}

