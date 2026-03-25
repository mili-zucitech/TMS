package com.company.tms.timesheet.service;

import com.company.tms.exception.ResourceNotFoundException;
import com.company.tms.notification.event.TimesheetApprovedEvent;
import com.company.tms.notification.event.TimesheetSubmittedEvent;
import com.company.tms.timesheet.dto.TimesheetCreateRequest;
import com.company.tms.timesheet.dto.TimesheetResponse;
import com.company.tms.timesheet.entity.Timesheet;
import com.company.tms.timesheet.entity.TimesheetStatus;
import com.company.tms.timesheet.mapper.TimesheetMapper;
import com.company.tms.timesheet.repository.TimesheetRepository;
import com.company.tms.timesheet.validator.TimesheetValidator;
import com.company.tms.user.entity.User;
import com.company.tms.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TimesheetService {

    private final TimesheetRepository timesheetRepository;
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
        timesheetValidator.validateNoDuplicateTimesheetForWeek(request.getUserId(), request.getWeekStartDate());

        Timesheet timesheet = timesheetMapper.toTimesheetEntity(request);
        timesheet.setStatus(TimesheetStatus.DRAFT);

        Timesheet saved = timesheetRepository.save(timesheet);
        log.info("Timesheet created with id: {}", saved.getId());
        return timesheetMapper.toTimesheetResponse(saved);
    }

    public TimesheetResponse getTimesheetById(Long id) {
        return timesheetMapper.toTimesheetResponse(getExistingTimesheet(id));
    }

    public TimesheetResponse getUserTimesheetForWeek(UUID userId, LocalDate weekStartDate) {
        Timesheet timesheet = timesheetRepository
                .findByUserIdAndWeekStartDate(userId, weekStartDate)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Timesheet", "userId/weekStartDate", userId + "/" + weekStartDate));
        return timesheetMapper.toTimesheetResponse(timesheet);
    }

    public List<TimesheetResponse> getTimesheetsByUser(UUID userId) {
        return timesheetRepository.findByUserId(userId).stream()
                .map(timesheetMapper::toTimesheetResponse)
                .collect(Collectors.toList());
    }

    public List<TimesheetResponse> getTimesheetsByStatus(TimesheetStatus status) {
        return timesheetRepository.findByStatus(status).stream()
                .map(timesheetMapper::toTimesheetResponse)
                .collect(Collectors.toList());
    }

    /**
     * Transitions DRAFT/REJECTED → SUBMITTED.
     * The timesheet must have at least one time entry.
     */
    @Transactional
    public TimesheetResponse submitTimesheet(Long id) {
        log.info("Submitting timesheet {}", id);
        Timesheet timesheet = getExistingTimesheet(id);
        timesheetValidator.validateTimesheetCanBeSubmitted(timesheet);
        timesheetValidator.validateTimesheetHasEntries(id);

        timesheet.setStatus(TimesheetStatus.SUBMITTED);
        timesheet.setSubmittedAt(LocalDateTime.now());
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

        return timesheetMapper.toTimesheetResponse(saved);
    }

    /**
     * Transitions SUBMITTED → APPROVED.
     * Only MANAGER or ADMIN may call this.
     */
    @Transactional
    public TimesheetResponse approveTimesheet(Long id, UUID approverId) {
        log.info("Approving timesheet {} by {}", id, approverId);
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

        return timesheetMapper.toTimesheetResponse(saved);
    }

    /**
     * Transitions SUBMITTED → REJECTED.
     * The timesheet returns to DRAFT on subsequent re-submission.
     */
    @Transactional
    public TimesheetResponse rejectTimesheet(Long id, UUID approverId, String rejectionReason) {
        log.info("Rejecting timesheet {} by {}", id, approverId);
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

        return timesheetMapper.toTimesheetResponse(saved);
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
        return timesheetMapper.toTimesheetResponse(timesheetRepository.save(timesheet));
    }

    /** Package-visible helper used by TimeEntryService to load and validate a timesheet. */
    Timesheet getExistingTimesheet(Long id) {
        return timesheetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Timesheet", "id", id));
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
                .map(timesheetMapper::toTimesheetResponse)
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

