package com.company.tms.timesheet.service;

import com.company.tms.exception.ResourceNotFoundException;
import com.company.tms.exception.ValidationException;
import com.company.tms.exception.ForbiddenException;
import com.company.tms.notification.event.TimesheetApprovedEvent;
import com.company.tms.notification.event.TimesheetSubmittedEvent;
import com.company.tms.timesheet.dto.TimesheetCreateRequest;
import com.company.tms.timesheet.dto.TimesheetResponse;
import com.company.tms.timesheet.dto.TimesheetSubmitRequest;
import com.company.tms.timesheet.entity.Timesheet;
import com.company.tms.timesheet.entity.TimesheetStatus;
import com.company.tms.timesheet.mapper.TimesheetMapper;
import com.company.tms.timesheet.repository.TimesheetRepository;
import com.company.tms.timesheet.repository.TimeEntryRepository;
import com.company.tms.timesheet.validator.TimesheetValidator;
import com.company.tms.user.entity.User;
import com.company.tms.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TimesheetService {

    private final TimesheetRepository timesheetRepository;
    private final TimeEntryRepository timeEntryRepository;
    private final TimesheetMapper timesheetMapper;
    private final TimesheetValidator timesheetValidator;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * Creates a new DRAFT timesheet for the given user and week.
     * One timesheet per user per week is enforced.
     */
    @Transactional
    public TimesheetResponse createWeeklyTimesheet(TimesheetCreateRequest request) {
        log.info("Creating timesheet for user {} week starting {}", request.getUserId(), request.getWeekStartDate());

        // Enforce that non-admin callers can only create timesheets for themselves
        String callerEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        userRepository.findByEmail(callerEmail).ifPresent(caller -> {
            boolean isPrivileged = SecurityContextHolder.getContext().getAuthentication()
                    .getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN")
                               || a.getAuthority().equals("ROLE_HR")
                               || a.getAuthority().equals("ROLE_HR_MANAGER")
                               || a.getAuthority().equals("ROLE_DIRECTOR"));
            if (!isPrivileged && !caller.getId().equals(request.getUserId())) {
                throw new ForbiddenException("You can only create timesheets for yourself.");
            }
        });

        if (request.getWeekStartDate().getDayOfWeek() != DayOfWeek.MONDAY) {
            throw new ValidationException("Week start date must be a Monday. Provided: "
                    + request.getWeekStartDate() + " (" + request.getWeekStartDate().getDayOfWeek() + ")");
        }

        // Always compute weekEndDate server-side — ignore any client-supplied value
        request.setWeekEndDate(request.getWeekStartDate().plusDays(6));

        timesheetValidator.validateNoDuplicateTimesheetForWeek(request.getUserId(), request.getWeekStartDate());

        Timesheet timesheet = timesheetMapper.toTimesheetEntity(request);
        timesheet.setStatus(TimesheetStatus.DRAFT);

        Timesheet saved = timesheetRepository.save(timesheet);
        log.info("Timesheet created with id: {}", saved.getId());
        return withMinutes(saved);
    }

    public TimesheetResponse getTimesheetById(Long id) {
        return withMinutes(getExistingTimesheet(id));
    }

    public TimesheetResponse getUserTimesheetForWeek(UUID userId, LocalDate weekStartDate) {
        Timesheet timesheet = timesheetRepository
                .findByUserIdAndWeekStartDate(userId, weekStartDate)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Timesheet", "userId/weekStartDate", userId + "/" + weekStartDate));
        return withMinutes(timesheet);
    }

    public List<TimesheetResponse> getTimesheetsByUser(UUID userId) {
        return timesheetRepository.findByUserId(userId).stream()
                .map(this::withMinutes)
                .collect(Collectors.toList());
    }

    public List<TimesheetResponse> getTimesheetsByStatus(TimesheetStatus status) {
        return timesheetRepository.findByStatus(status).stream()
                .map(this::withMinutes)
                .collect(Collectors.toList());
    }

    /**
     * Returns a user's timesheets filtered by year, month, and/or ISO week number.
     * Filters are applied to {@code weekStartDate}.
     * <ul>
     *   <li>If {@code week} is supplied (with an explicit or implied year), the result
     *       is narrowed to the single week whose Monday matches that ISO week.</li>
     *   <li>If only {@code month} (and optionally {@code year}) are supplied, all
     *       weeks whose Monday falls within that calendar month are returned.</li>
     *   <li>If only {@code year} is supplied, all weeks of that year are returned.</li>
     *   <li>If none of the three parameters are supplied, all timesheets are returned.</li>
     * </ul>
     */
    public List<TimesheetResponse> getTimesheetsByUserFiltered(
            UUID userId, Integer year, Integer month, Integer week) {
        int effectiveYear = (year != null) ? year : LocalDate.now().getYear();
        LocalDate from = null;
        LocalDate to = null;

        if (week != null) {
            // ISO week 1 always contains Jan 4; find its Monday, then offset by (week-1) weeks.
            LocalDate weekMonday = LocalDate.of(effectiveYear, 1, 4)
                    .with(DayOfWeek.MONDAY)
                    .plusWeeks(week - 1);
            from = weekMonday;
            to = weekMonday;
        } else if (month != null) {
            from = LocalDate.of(effectiveYear, month, 1);
            to = from.with(TemporalAdjusters.lastDayOfMonth());
        } else if (year != null) {
            from = LocalDate.of(year, 1, 1);
            to = LocalDate.of(year, 12, 31);
        }

        return timesheetRepository.findByUserIdAndWeekStartDateRange(userId, from, to).stream()
                .map(this::withMinutes)
                .collect(Collectors.toList());
    }

    /**
     * Transitions DRAFT/REJECTED → SUBMITTED.
     * The timesheet must have at least one time entry.
     */
    @Transactional
    public TimesheetResponse submitTimesheet(Long id, TimesheetSubmitRequest request) {
        log.info("Submitting timesheet {}", id);
        Timesheet timesheet = getExistingTimesheet(id);
        timesheetValidator.validateTimesheetCanBeSubmitted(timesheet);
        timesheetValidator.validateTimesheetHasEntries(id);

        timesheet.setStatus(TimesheetStatus.SUBMITTED);
        timesheet.setSubmittedAt(LocalDateTime.now());
        if (request != null && request.getOvertimeReason() != null && !request.getOvertimeReason().isBlank()) {
            timesheet.setOvertimeReason(request.getOvertimeReason().trim());
        } else {
            timesheet.setOvertimeReason(null);
        }
        Timesheet saved = timesheetRepository.save(timesheet);
        log.info("Timesheet {} submitted", id);

        // Publish event so the notification listener can notify both the submitter and their manager
        userRepository.findById(saved.getUserId()).ifPresent(submitter -> {
            UUID managerId = submitter.getManagerId();
            String managerEmail = managerId != null
                    ? userRepository.findById(managerId).map(User::getEmail).orElse(null)
                    : null;
            eventPublisher.publishEvent(new TimesheetSubmittedEvent(
                    this, submitter.getId(), saved.getId(),
                    submitter.getEmail(), submitter.getName(),
                    managerId, managerEmail
            ));
        });

        return withMinutes(saved);
    }

    /**
     * Transitions SUBMITTED → APPROVED.
     * Only MANAGER or ADMIN may call this.
     */
    @Transactional
    public TimesheetResponse approveTimesheet(Long id) {
        String callerEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        UUID approverId = userRepository.findByEmail(callerEmail).map(User::getId).orElse(null);
        log.info("Approving timesheet {} by {}", id, callerEmail);
        Timesheet timesheet = getExistingTimesheet(id);
        timesheetValidator.validateTimesheetCanBeApproved(timesheet);

        timesheet.setStatus(TimesheetStatus.APPROVED);
        timesheet.setApprovedAt(LocalDateTime.now());
        timesheet.setApprovedBy(approverId);
        timesheet.setRejectionReason(null);
        Timesheet saved = timesheetRepository.save(timesheet);
        log.info("Timesheet {} approved", id);

        userRepository.findById(saved.getUserId()).ifPresent(owner ->
                eventPublisher.publishEvent(new TimesheetApprovedEvent(
                        this, owner.getId(), saved.getId(), owner.getEmail(), owner.getName(), true, null
                ))
        );

        return withMinutes(saved);
    }

    /**
     * Transitions SUBMITTED → REJECTED.
     * The timesheet returns to DRAFT on subsequent re-submission.
     */
    @Transactional
    public TimesheetResponse rejectTimesheet(Long id, String rejectionReason) {
        String callerEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        UUID approverId = userRepository.findByEmail(callerEmail).map(User::getId).orElse(null);
        log.info("Rejecting timesheet {} by {}", id, callerEmail);
        Timesheet timesheet = getExistingTimesheet(id);
        timesheetValidator.validateTimesheetCanBeApproved(timesheet);

        timesheet.setStatus(TimesheetStatus.REJECTED);
        timesheet.setApprovedBy(approverId);
        timesheet.setRejectionReason(rejectionReason);
        Timesheet saved = timesheetRepository.save(timesheet);
        log.info("Timesheet {} rejected", id);

        userRepository.findById(saved.getUserId()).ifPresent(owner ->
                eventPublisher.publishEvent(new TimesheetApprovedEvent(
                        this, owner.getId(), saved.getId(), owner.getEmail(), owner.getName(), false, rejectionReason
                ))
        );

        return withMinutes(saved);
    }

    /**
     * Transitions APPROVED → LOCKED. Entries can no longer be modified.
     * Only ADMIN may call this.
     */
    @Transactional
    public TimesheetResponse lockTimesheet(Long id) {
        log.info("Locking timesheet {}", id);
        Timesheet timesheet = getExistingTimesheet(id);
        timesheetValidator.validateTimesheetCanBeLocked(timesheet);

        timesheet.setStatus(TimesheetStatus.LOCKED);
        log.info("Timesheet {} locked", id);
        Timesheet saved = timesheetRepository.save(timesheet);
        return withMinutes(saved);
    }

    /** Package-visible helper used by TimeEntryService to load and validate a timesheet. */
    Timesheet getExistingTimesheet(Long id) {
        return timesheetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Timesheet", "id", id));
    }

    /**
     * Maps a Timesheet entity to a response DTO and populates totalMinutes from the
     * time_entries table. Used by all read methods so the manager dashboard always
     * receives the correct logged hours.
     */
    private TimesheetResponse withMinutes(Timesheet timesheet) {
        TimesheetResponse response = timesheetMapper.toTimesheetResponse(timesheet);
        response.setTotalMinutes(timeEntryRepository.sumDurationMinutesByTimesheetId(timesheet.getId()));
        return response;
    }

    /**
     * Returns all timesheets for every direct report of the given manager.
     * Direct reports are users whose managerId equals the given managerId.
     */
    public List<TimesheetResponse> getTimesheetsForTeam(UUID managerId) {
        List<UUID> directReportIds = userRepository.findByManagerId(managerId)
                .stream()
                .map(User::getId)
                .collect(Collectors.toList());
        if (directReportIds.isEmpty()) {
            return List.of();
        }
        return timesheetRepository.findByUserIdIn(directReportIds).stream()
                .map(this::withMinutes)
                .collect(Collectors.toList());
    }

    /**
     * Returns true if the given email belongs to the owner of the specified timesheet.
     * Used in @PreAuthorize expressions.
     */
    public boolean isOwnerOfTimesheet(String userEmail, Long timesheetId) {
        try {
            Timesheet timesheet = getExistingTimesheet(timesheetId);
            return userRepository.findByEmail(userEmail)
                    .map(u -> u.getId().equals(timesheet.getUserId()))
                    .orElse(false);
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Returns true if the given email belongs to the reporting manager
     * (User.managerId) of the timesheet's owner.
     * Used in @PreAuthorize expressions.
     */
    public boolean isReportingManagerOfTimesheetOwner(String managerEmail, Long timesheetId) {
        try {
            Timesheet timesheet = getExistingTimesheet(timesheetId);
            return userRepository.findById(timesheet.getUserId())
                    .flatMap(employee -> userRepository.findByEmail(managerEmail)
                            .map(manager -> manager.getId().equals(employee.getManagerId())))
                    .orElse(false);
        } catch (Exception e) {
            return false;
        }
    }
}

