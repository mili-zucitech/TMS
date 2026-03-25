package com.company.tms.timesheet.service;

import com.company.tms.exception.ResourceNotFoundException;
import com.company.tms.timesheet.dto.TimeEntryCreateRequest;
import com.company.tms.timesheet.dto.TimeEntryResponse;
import com.company.tms.timesheet.dto.TimeEntryUpdateRequest;
import com.company.tms.timesheet.entity.TimeEntry;
import com.company.tms.timesheet.entity.Timesheet;
import com.company.tms.timesheet.mapper.TimesheetMapper;
import com.company.tms.timesheet.repository.TimeEntryRepository;
import com.company.tms.timesheet.validator.TimesheetValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@SuppressWarnings("null")
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TimeEntryService {

    private final TimeEntryRepository timeEntryRepository;
    private final TimesheetService timesheetService;
    private final TimesheetMapper timesheetMapper;
    private final TimesheetValidator timesheetValidator;

    /**
     * Creates a new time entry after validating:
     * - parent timesheet is editable (DRAFT/REJECTED)
     * - user is assigned to the project
     * - end time is after start time
     * - no overlap with existing entries on same day
     * - daily total does not exceed 24 hours
     */
    @Transactional
    public TimeEntryResponse createTimeEntry(TimeEntryCreateRequest request) {
        log.info("Creating time entry for user {} on {} (project {})",
                request.getUserId(), request.getWorkDate(), request.getProjectId());

        Timesheet timesheet = timesheetService.getExistingTimesheet(request.getTimesheetId());
        timesheetValidator.validateTimesheetIsEditable(timesheet);
        timesheetValidator.validateUserAssignedToProject(request.getUserId(), request.getProjectId());
        timesheetValidator.validateEndTimeAfterStartTime(request.getStartTime(), request.getEndTime());

        int durationMinutes = calculateDurationMinutes(request.getStartTime(), request.getEndTime());
        timesheetValidator.validateNoTimeOverlap(
                request.getUserId(), request.getWorkDate(),
                request.getStartTime(), request.getEndTime(), -1L);
        timesheetValidator.validateDailyLimitNotExceeded(
                request.getUserId(), request.getWorkDate(), durationMinutes, -1L);

        TimeEntry entry = timesheetMapper.toTimeEntryEntity(request);
        entry.setDurationMinutes(durationMinutes);

        TimeEntry saved = timeEntryRepository.save(entry);
        log.info("Time entry created with id: {}", saved.getId());
        return timesheetMapper.toTimeEntryResponse(saved);
    }

    /**
     * Updates an existing time entry. Re-validates all constraints using
     * the effective (merged) start/end times and excludes the entry itself
     * from the overlap check.
     */
    @Transactional
    public TimeEntryResponse updateTimeEntry(Long id, TimeEntryUpdateRequest request) {
        log.info("Updating time entry {}", id);
        TimeEntry entry = getExistingTimeEntry(id);
        Timesheet timesheet = timesheetService.getExistingTimesheet(entry.getTimesheetId());
        timesheetValidator.validateTimesheetIsEditable(timesheet);

        LocalTime effectiveStart = request.getStartTime() != null ? request.getStartTime() : entry.getStartTime();
        LocalTime effectiveEnd   = request.getEndTime()   != null ? request.getEndTime()   : entry.getEndTime();
        LocalDate effectiveDate  = request.getWorkDate()  != null ? request.getWorkDate()  : entry.getWorkDate();

        timesheetValidator.validateEndTimeAfterStartTime(effectiveStart, effectiveEnd);

        int durationMinutes = calculateDurationMinutes(effectiveStart, effectiveEnd);
        timesheetValidator.validateNoTimeOverlap(
                entry.getUserId(), effectiveDate, effectiveStart, effectiveEnd, entry.getId());
        timesheetValidator.validateDailyLimitNotExceeded(
                entry.getUserId(), effectiveDate, durationMinutes, entry.getId());

        if (request.getProjectId() != null) {
            timesheetValidator.validateUserAssignedToProject(entry.getUserId(), request.getProjectId());
        }

        timesheetMapper.updateTimeEntryEntity(request, entry);
        entry.setDurationMinutes(durationMinutes);
        // Ensure computed fields are set directly when mapper ignores them
        if (request.getWorkDate()  != null) entry.setWorkDate(effectiveDate);
        if (request.getStartTime() != null) entry.setStartTime(effectiveStart);
        if (request.getEndTime()   != null) entry.setEndTime(effectiveEnd);

        TimeEntry saved = timeEntryRepository.save(entry);
        return timesheetMapper.toTimeEntryResponse(saved);
    }

    /**
     * Deletes a time entry. The parent timesheet must be editable.
     */
    @Transactional
    public void deleteTimeEntry(Long id) {
        log.info("Deleting time entry {}", id);
        TimeEntry entry = getExistingTimeEntry(id);
        Timesheet timesheet = timesheetService.getExistingTimesheet(entry.getTimesheetId());
        timesheetValidator.validateTimesheetIsEditable(timesheet);
        timeEntryRepository.delete(entry);
        log.info("Time entry {} deleted", id);
    }

    public List<TimeEntryResponse> getEntriesByTimesheet(Long timesheetId) {
        return timeEntryRepository.findByTimesheetId(timesheetId).stream()
                .map(timesheetMapper::toTimeEntryResponse)
                .collect(Collectors.toList());
    }

    public List<TimeEntryResponse> getEntriesByUserAndDate(UUID userId, LocalDate date) {
        return timeEntryRepository.findByUserIdAndWorkDate(userId, date).stream()
                .map(timesheetMapper::toTimeEntryResponse)
                .collect(Collectors.toList());
    }

    private int calculateDurationMinutes(LocalTime startTime, LocalTime endTime) {
        return (int) ChronoUnit.MINUTES.between(startTime, endTime);
    }

    private TimeEntry getExistingTimeEntry(Long id) {
        return timeEntryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("TimeEntry", "id", id));
    }
}
