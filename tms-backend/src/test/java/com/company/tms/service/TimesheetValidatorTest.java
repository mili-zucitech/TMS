package com.company.tms.service;

import com.company.tms.exception.ValidationException;
import com.company.tms.project.repository.ProjectAssignmentRepository;
import com.company.tms.timesheet.entity.Timesheet;
import com.company.tms.timesheet.entity.TimesheetStatus;
import com.company.tms.timesheet.exception.InvalidTimesheetStateException;
import com.company.tms.timesheet.exception.TimeOverlapException;
import com.company.tms.timesheet.exception.TimesheetLockedException;
import com.company.tms.timesheet.repository.TimeEntryRepository;
import com.company.tms.timesheet.repository.TimesheetRepository;
import com.company.tms.timesheet.validator.TimesheetValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("TimesheetValidator Unit Tests")
class TimesheetValidatorTest {

    @Mock private TimesheetRepository timesheetRepository;
    @Mock private TimeEntryRepository timeEntryRepository;
    @Mock private ProjectAssignmentRepository projectAssignmentRepository;

    @InjectMocks
    private TimesheetValidator timesheetValidator;

    private UUID userId;
    private LocalDate weekStart;
    private LocalDate workDate;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        weekStart = LocalDate.of(2026, 3, 16);
        workDate = LocalDate.of(2026, 3, 18);
    }

    // ============================================================================
    // Duplicate Timesheet Validation
    // ============================================================================

    @Test
    @DisplayName("validateNoDuplicateTimesheetForWeek - passes when no existing timesheet")
    void validateNoDuplicate_NoExisting_Passes() {
        when(timesheetRepository.findByUserIdAndWeekStartDate(userId, weekStart))
                .thenReturn(Optional.empty());

        assertThatCode(() -> timesheetValidator.validateNoDuplicateTimesheetForWeek(userId, weekStart))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("validateNoDuplicateTimesheetForWeek - throws when duplicate exists")
    void validateNoDuplicate_ExistingFound_ThrowsValidationException() {
        Timesheet existing = Timesheet.builder().id(1L).userId(userId).build();
        when(timesheetRepository.findByUserIdAndWeekStartDate(userId, weekStart))
                .thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> timesheetValidator.validateNoDuplicateTimesheetForWeek(userId, weekStart))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("timesheet already exists");
    }

    // ============================================================================
    // Timesheet Editable Validation
    // ============================================================================

    @Test
    @DisplayName("validateTimesheetIsEditable - DRAFT is modifiable")
    void validateEditable_Draft_Passes() {
        Timesheet ts = Timesheet.builder().id(1L).status(TimesheetStatus.DRAFT).build();

        assertThatCode(() -> timesheetValidator.validateTimesheetIsEditable(ts))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("validateTimesheetIsEditable - REJECTED is modifiable")
    void validateEditable_Rejected_Passes() {
        Timesheet ts = Timesheet.builder().id(1L).status(TimesheetStatus.REJECTED).build();

        assertThatCode(() -> timesheetValidator.validateTimesheetIsEditable(ts))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("validateTimesheetIsEditable - SUBMITTED throws TimesheetLockedException")
    void validateEditable_Submitted_ThrowsLockedException() {
        Timesheet ts = Timesheet.builder().id(1L).status(TimesheetStatus.SUBMITTED).build();

        assertThatThrownBy(() -> timesheetValidator.validateTimesheetIsEditable(ts))
                .isInstanceOf(TimesheetLockedException.class)
                .hasMessageContaining("SUBMITTED");
    }

    @Test
    @DisplayName("validateTimesheetIsEditable - LOCKED throws TimesheetLockedException")
    void validateEditable_Locked_ThrowsLockedException() {
        Timesheet ts = Timesheet.builder().id(1L).status(TimesheetStatus.LOCKED).build();

        assertThatThrownBy(() -> timesheetValidator.validateTimesheetIsEditable(ts))
                .isInstanceOf(TimesheetLockedException.class)
                .hasMessageContaining("LOCKED");
    }

    // ============================================================================
    // Timesheet Has Entries
    // ============================================================================

    @Test
    @DisplayName("validateTimesheetHasEntries - passes when entries exist")
    void validateHasEntries_Entries_Passes() {
        when(timeEntryRepository.existsByTimesheetId(1L)).thenReturn(true);

        assertThatCode(() -> timesheetValidator.validateTimesheetHasEntries(1L))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("validateTimesheetHasEntries - throws when no entries")
    void validateHasEntries_NoEntries_ThrowsValidationException() {
        when(timeEntryRepository.existsByTimesheetId(1L)).thenReturn(false);

        assertThatThrownBy(() -> timesheetValidator.validateTimesheetHasEntries(1L))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("no time entries");
    }

    // ============================================================================
    // Timesheet State Transition Validation
    // ============================================================================

    @Test
    @DisplayName("validateTimesheetCanBeSubmitted - DRAFT can be submitted")
    void validateCanBeSubmitted_Draft_Passes() {
        Timesheet ts = Timesheet.builder().id(1L).status(TimesheetStatus.DRAFT).build();

        assertThatCode(() -> timesheetValidator.validateTimesheetCanBeSubmitted(ts))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("validateTimesheetCanBeSubmitted - REJECTED can be resubmitted")
    void validateCanBeSubmitted_Rejected_Passes() {
        Timesheet ts = Timesheet.builder().id(1L).status(TimesheetStatus.REJECTED).build();

        assertThatCode(() -> timesheetValidator.validateTimesheetCanBeSubmitted(ts))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("validateTimesheetCanBeSubmitted - APPROVED throws InvalidTimesheetStateException")
    void validateCanBeSubmitted_Approved_ThrowsInvalidState() {
        Timesheet ts = Timesheet.builder().id(1L).status(TimesheetStatus.APPROVED).build();

        assertThatThrownBy(() -> timesheetValidator.validateTimesheetCanBeSubmitted(ts))
                .isInstanceOf(InvalidTimesheetStateException.class)
                .hasMessageContaining("DRAFT or REJECTED");
    }

    @Test
    @DisplayName("validateTimesheetCanBeSubmitted - SUBMITTED throws InvalidTimesheetStateException")
    void validateCanBeSubmitted_Submitted_ThrowsInvalidState() {
        Timesheet ts = Timesheet.builder().id(1L).status(TimesheetStatus.SUBMITTED).build();

        assertThatThrownBy(() -> timesheetValidator.validateTimesheetCanBeSubmitted(ts))
                .isInstanceOf(InvalidTimesheetStateException.class);
    }

    @Test
    @DisplayName("validateTimesheetCanBeApproved - SUBMITTED can be approved")
    void validateCanBeApproved_Submitted_Passes() {
        Timesheet ts = Timesheet.builder().id(1L).status(TimesheetStatus.SUBMITTED).build();

        assertThatCode(() -> timesheetValidator.validateTimesheetCanBeApproved(ts))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("validateTimesheetCanBeApproved - DRAFT throws InvalidTimesheetStateException")
    void validateCanBeApproved_Draft_ThrowsInvalidState() {
        Timesheet ts = Timesheet.builder().id(1L).status(TimesheetStatus.DRAFT).build();

        assertThatThrownBy(() -> timesheetValidator.validateTimesheetCanBeApproved(ts))
                .isInstanceOf(InvalidTimesheetStateException.class)
                .hasMessageContaining("SUBMITTED state");
    }

    @Test
    @DisplayName("validateTimesheetCanBeLocked - APPROVED can be locked")
    void validateCanBeLocked_Approved_Passes() {
        Timesheet ts = Timesheet.builder().id(1L).status(TimesheetStatus.APPROVED).build();

        assertThatCode(() -> timesheetValidator.validateTimesheetCanBeLocked(ts))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("validateTimesheetCanBeLocked - SUBMITTED throws InvalidTimesheetStateException")
    void validateCanBeLocked_Submitted_ThrowsInvalidState() {
        Timesheet ts = Timesheet.builder().id(1L).status(TimesheetStatus.SUBMITTED).build();

        assertThatThrownBy(() -> timesheetValidator.validateTimesheetCanBeLocked(ts))
                .isInstanceOf(InvalidTimesheetStateException.class)
                .hasMessageContaining("APPROVED state");
    }

    @Test
    @DisplayName("validateTimesheetCanBeLocked - DRAFT throws InvalidTimesheetStateException")
    void validateCanBeLocked_Draft_ThrowsInvalidState() {
        Timesheet ts = Timesheet.builder().id(1L).status(TimesheetStatus.DRAFT).build();

        assertThatThrownBy(() -> timesheetValidator.validateTimesheetCanBeLocked(ts))
                .isInstanceOf(InvalidTimesheetStateException.class);
    }

    // ============================================================================
    // Project Assignment Validation
    // ============================================================================

    @Test
    @DisplayName("validateUserAssignedToProject - passes when user is assigned")
    void validateUserAssigned_AssignedUser_Passes() {
        when(projectAssignmentRepository.existsByUserIdAndProjectId(userId, 1L)).thenReturn(true);

        assertThatCode(() -> timesheetValidator.validateUserAssignedToProject(userId, 1L))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("validateUserAssignedToProject - throws when user is not assigned")
    void validateUserAssigned_NotAssigned_ThrowsValidationException() {
        when(projectAssignmentRepository.existsByUserIdAndProjectId(userId, 1L)).thenReturn(false);

        assertThatThrownBy(() -> timesheetValidator.validateUserAssignedToProject(userId, 1L))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("not assigned to project");
    }

    // ============================================================================
    // Time Range Validation
    // ============================================================================

    @Test
    @DisplayName("validateEndTimeAfterStartTime - valid times pass")
    void validateEndTime_ValidRange_Passes() {
        LocalTime start = LocalTime.of(9, 0);
        LocalTime end = LocalTime.of(17, 0);

        assertThatCode(() -> timesheetValidator.validateEndTimeAfterStartTime(start, end))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("validateEndTimeAfterStartTime - end before start throws ValidationException")
    void validateEndTime_EndBeforeStart_ThrowsValidationException() {
        LocalTime start = LocalTime.of(17, 0);
        LocalTime end = LocalTime.of(9, 0);

        assertThatThrownBy(() -> timesheetValidator.validateEndTimeAfterStartTime(start, end))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("End time must be after start time");
    }

    @Test
    @DisplayName("validateEndTimeAfterStartTime - same start and end time throws ValidationException")
    void validateEndTime_SameStartAndEnd_ThrowsValidationException() {
        LocalTime time = LocalTime.of(9, 0);

        assertThatThrownBy(() -> timesheetValidator.validateEndTimeAfterStartTime(time, time))
                .isInstanceOf(ValidationException.class);
    }

    // ============================================================================
    // Overlap Detection
    // ============================================================================

    @Test
    @DisplayName("validateNoTimeOverlap - no overlapping entries passes")
    void validateNoOverlap_NoOverlap_Passes() {
        when(timeEntryRepository.findOverlappingEntries(
                eq(userId), eq(workDate), any(LocalTime.class), any(LocalTime.class), eq(-1L)))
                .thenReturn(List.of());

        assertThatCode(() -> timesheetValidator.validateNoTimeOverlap(
                userId, workDate,
                LocalTime.of(9, 0), LocalTime.of(12, 0), -1L))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("validateNoTimeOverlap - overlapping entries throws TimeOverlapException")
    void validateNoOverlap_OverlapFound_ThrowsTimeOverlapException() {
        com.company.tms.timesheet.entity.TimeEntry overlappingEntry =
                com.company.tms.timesheet.entity.TimeEntry.builder()
                        .id(5L).userId(userId).workDate(workDate)
                        .startTime(LocalTime.of(10, 0)).endTime(LocalTime.of(14, 0))
                        .build();

        when(timeEntryRepository.findOverlappingEntries(
                eq(userId), eq(workDate), any(LocalTime.class), any(LocalTime.class), eq(-1L)))
                .thenReturn(List.of(overlappingEntry));

        assertThatThrownBy(() -> timesheetValidator.validateNoTimeOverlap(
                userId, workDate,
                LocalTime.of(12, 0), LocalTime.of(15, 0), -1L))
                .isInstanceOf(TimeOverlapException.class)
                .hasMessageContaining("Time overlap");
    }

    // ============================================================================
    // Daily Limit Validation
    // ============================================================================

    @Test
    @DisplayName("validateDailyLimitNotExceeded - within 24h limit passes")
    void validateDailyLimit_Within24h_Passes() {
        when(timeEntryRepository.sumDurationMinutesByUserAndWorkDate(userId, workDate, -1L))
                .thenReturn(480); // 8 hours already logged

        assertThatCode(() -> timesheetValidator.validateDailyLimitNotExceeded(
                userId, workDate, 120, -1L)) // adding 2 more hours
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("validateDailyLimitNotExceeded - exceeding 24h limit throws ValidationException")
    void validateDailyLimit_Exceeds24h_ThrowsValidationException() {
        when(timeEntryRepository.sumDurationMinutesByUserAndWorkDate(userId, workDate, -1L))
                .thenReturn(23 * 60); // 23 hours already logged

        assertThatThrownBy(() -> timesheetValidator.validateDailyLimitNotExceeded(
                userId, workDate, 120, -1L)) // adding 2 more hours → exceeds 24h
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("24 hours");
    }

    @Test
    @DisplayName("validateDailyLimitNotExceeded - exactly 24h is invalid (>24h check)")
    void validateDailyLimit_Exactly24h_Passes() {
        when(timeEntryRepository.sumDurationMinutesByUserAndWorkDate(userId, workDate, -1L))
                .thenReturn(22 * 60); // 22 hours

        assertThatCode(() -> timesheetValidator.validateDailyLimitNotExceeded(
                userId, workDate, 2 * 60, -1L)) // exactly 24h total
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("update scenario: excludes self from overlap check")
    void validateNoOverlap_UpdateExcludesSelf_Passes() {
        Long entryId = 10L;
        when(timeEntryRepository.findOverlappingEntries(
                eq(userId), eq(workDate), any(LocalTime.class), any(LocalTime.class), eq(entryId)))
                .thenReturn(List.of()); // self is excluded so no overlaps

        assertThatCode(() -> timesheetValidator.validateNoTimeOverlap(
                userId, workDate,
                LocalTime.of(9, 0), LocalTime.of(12, 0), entryId))
                .doesNotThrowAnyException();
    }
}
