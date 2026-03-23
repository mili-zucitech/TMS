package com.company.tms.service;

import com.company.tms.exception.ResourceNotFoundException;
import com.company.tms.exception.ValidationException;
import com.company.tms.notification.event.TimesheetApprovedEvent;
import com.company.tms.notification.event.TimesheetSubmittedEvent;
import com.company.tms.timesheet.dto.TimesheetCreateRequest;
import com.company.tms.timesheet.dto.TimesheetResponse;
import com.company.tms.timesheet.entity.Timesheet;
import com.company.tms.timesheet.entity.TimesheetStatus;
import com.company.tms.timesheet.exception.InvalidTimesheetStateException;
import com.company.tms.timesheet.mapper.TimesheetMapper;
import com.company.tms.timesheet.repository.TimesheetRepository;
import com.company.tms.timesheet.service.TimesheetService;
import com.company.tms.timesheet.validator.TimesheetValidator;
import com.company.tms.user.entity.User;
import com.company.tms.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("TimesheetService Unit Tests")
class TimesheetServiceTest {

    @Mock private TimesheetRepository timesheetRepository;
    @Mock private TimesheetMapper timesheetMapper;
    @Mock private TimesheetValidator timesheetValidator;
    @Mock private UserRepository userRepository;
    @Mock private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private TimesheetService timesheetService;

    private UUID userId;
    private UUID managerId;
    private User testUser;
    private User managerUser;
    private Timesheet draftTimesheet;
    private Timesheet submittedTimesheet;
    private Timesheet approvedTimesheet;
    private TimesheetResponse timesheetResponse;
    private LocalDate weekStart;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        managerId = UUID.randomUUID();
        weekStart = LocalDate.of(2026, 3, 16);

        testUser = User.builder()
                .id(userId)
                .email("employee@company.com")
                .name("John Employee")
                .managerId(managerId)
                .build();

        managerUser = User.builder()
                .id(managerId)
                .email("manager@company.com")
                .name("Jane Manager")
                .build();

        draftTimesheet = Timesheet.builder()
                .id(1L)
                .userId(userId)
                .weekStartDate(weekStart)
                .weekEndDate(weekStart.plusDays(6))
                .status(TimesheetStatus.DRAFT)
                .createdAt(LocalDateTime.now())
                .build();

        submittedTimesheet = Timesheet.builder()
                .id(2L)
                .userId(userId)
                .weekStartDate(weekStart)
                .weekEndDate(weekStart.plusDays(6))
                .status(TimesheetStatus.SUBMITTED)
                .submittedAt(LocalDateTime.now())
                .createdAt(LocalDateTime.now())
                .build();

        approvedTimesheet = Timesheet.builder()
                .id(3L)
                .userId(userId)
                .weekStartDate(weekStart)
                .weekEndDate(weekStart.plusDays(6))
                .status(TimesheetStatus.APPROVED)
                .approvedAt(LocalDateTime.now())
                .approvedBy(managerId)
                .createdAt(LocalDateTime.now())
                .build();

        timesheetResponse = TimesheetResponse.builder()
                .id(1L)
                .userId(userId)
                .weekStartDate(weekStart)
                .weekEndDate(weekStart.plusDays(6))
                .status(TimesheetStatus.DRAFT)
                .build();
    }

    @Nested
    @DisplayName("CreateWeeklyTimesheet")
    class CreateWeeklyTimesheet {

        @Test
        @DisplayName("should create a new DRAFT timesheet successfully")
        void createWeeklyTimesheet_Success() {
            TimesheetCreateRequest request = new TimesheetCreateRequest(
                    userId, weekStart, weekStart.plusDays(6));

            doNothing().when(timesheetValidator)
                    .validateNoDuplicateTimesheetForWeek(userId, weekStart);
            when(timesheetMapper.toTimesheetEntity(request)).thenReturn(draftTimesheet);
            when(timesheetRepository.save(any(Timesheet.class))).thenReturn(draftTimesheet);
            when(timesheetMapper.toTimesheetResponse(draftTimesheet)).thenReturn(timesheetResponse);

            TimesheetResponse result = timesheetService.createWeeklyTimesheet(request);

            assertThat(result).isNotNull();
            assertThat(result.getStatus()).isEqualTo(TimesheetStatus.DRAFT);
            verify(timesheetRepository).save(argThat(ts -> ts.getStatus() == TimesheetStatus.DRAFT));
        }

        @Test
        @DisplayName("should throw ValidationException when duplicate timesheet for same week")
        void createWeeklyTimesheet_DuplicateWeek_ThrowsValidationException() {
            TimesheetCreateRequest request = new TimesheetCreateRequest(
                    userId, weekStart, weekStart.plusDays(6));

            doThrow(new ValidationException("A timesheet already exists for user " + userId))
                    .when(timesheetValidator).validateNoDuplicateTimesheetForWeek(userId, weekStart);

            assertThatThrownBy(() -> timesheetService.createWeeklyTimesheet(request))
                    .isInstanceOf(ValidationException.class)
                    .hasMessageContaining("timesheet already exists");

            verify(timesheetRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("GetTimesheetById")
    class GetTimesheetById {

        @Test
        @DisplayName("should return timesheet when ID exists")
        void getTimesheetById_Success() {
            when(timesheetRepository.findById(1L)).thenReturn(Optional.of(draftTimesheet));
            when(timesheetMapper.toTimesheetResponse(draftTimesheet)).thenReturn(timesheetResponse);

            TimesheetResponse result = timesheetService.getTimesheetById(1L);

            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo(1L);
        }

        @Test
        @DisplayName("should throw ResourceNotFoundException when timesheet does not exist")
        void getTimesheetById_NotFound_ThrowsException() {
            when(timesheetRepository.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> timesheetService.getTimesheetById(999L))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("Timesheet");
        }
    }

    @Nested
    @DisplayName("SubmitTimesheet")
    class SubmitTimesheet {

        @Test
        @DisplayName("should transition DRAFT timesheet to SUBMITTED and publish event")
        void submitTimesheet_FromDraft_Success() {
            TimesheetResponse submittedResponse = TimesheetResponse.builder()
                    .id(1L)
                    .userId(userId)
                    .status(TimesheetStatus.SUBMITTED)
                    .build();

            when(timesheetRepository.findById(1L)).thenReturn(Optional.of(draftTimesheet));
            doNothing().when(timesheetValidator).validateTimesheetCanBeSubmitted(draftTimesheet);
            doNothing().when(timesheetValidator).validateTimesheetHasEntries(1L);
            when(timesheetRepository.save(draftTimesheet)).thenReturn(draftTimesheet);
            when(timesheetMapper.toTimesheetResponse(draftTimesheet)).thenReturn(submittedResponse);
            when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));
            when(userRepository.findById(managerId)).thenReturn(Optional.of(managerUser));

            TimesheetResponse result = timesheetService.submitTimesheet(1L);

            assertThat(result.getStatus()).isEqualTo(TimesheetStatus.SUBMITTED);
            assertThat(draftTimesheet.getStatus()).isEqualTo(TimesheetStatus.SUBMITTED);
            assertThat(draftTimesheet.getSubmittedAt()).isNotNull();

            ArgumentCaptor<TimesheetSubmittedEvent> eventCaptor =
                    ArgumentCaptor.forClass(TimesheetSubmittedEvent.class);
            verify(eventPublisher).publishEvent(eventCaptor.capture());
            TimesheetSubmittedEvent event = eventCaptor.getValue();
            assertThat(event.getSubmittedByUserId()).isEqualTo(userId);
            assertThat(event.getManagerId()).isEqualTo(managerId);
        }

        @Test
        @DisplayName("should throw InvalidTimesheetStateException when submitting APPROVED timesheet")
        void submitTimesheet_FromApproved_ThrowsInvalidState() {
            when(timesheetRepository.findById(3L)).thenReturn(Optional.of(approvedTimesheet));
            doThrow(new InvalidTimesheetStateException("Cannot submit APPROVED timesheet"))
                    .when(timesheetValidator).validateTimesheetCanBeSubmitted(approvedTimesheet);

            assertThatThrownBy(() -> timesheetService.submitTimesheet(3L))
                    .isInstanceOf(InvalidTimesheetStateException.class);

            verify(timesheetRepository, never()).save(any());
        }

        @Test
        @DisplayName("should throw ValidationException when timesheet has no entries")
        void submitTimesheet_NoEntries_ThrowsValidationException() {
            when(timesheetRepository.findById(1L)).thenReturn(Optional.of(draftTimesheet));
            doNothing().when(timesheetValidator).validateTimesheetCanBeSubmitted(draftTimesheet);
            doThrow(new ValidationException("Timesheet 1 has no time entries"))
                    .when(timesheetValidator).validateTimesheetHasEntries(1L);

            assertThatThrownBy(() -> timesheetService.submitTimesheet(1L))
                    .isInstanceOf(ValidationException.class)
                    .hasMessageContaining("no time entries");
        }
    }

    @Nested
    @DisplayName("ApproveTimesheet")
    class ApproveTimesheet {

        @Test
        @DisplayName("should approve SUBMITTED timesheet and publish approval event")
        void approveTimesheet_Success() {
            TimesheetResponse approvedResponse = TimesheetResponse.builder()
                    .id(2L).userId(userId).status(TimesheetStatus.APPROVED).build();

            when(timesheetRepository.findById(2L)).thenReturn(Optional.of(submittedTimesheet));
            doNothing().when(timesheetValidator).validateTimesheetCanBeApproved(submittedTimesheet);
            when(timesheetRepository.save(submittedTimesheet)).thenReturn(submittedTimesheet);
            when(timesheetMapper.toTimesheetResponse(submittedTimesheet)).thenReturn(approvedResponse);
            when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));

            TimesheetResponse result = timesheetService.approveTimesheet(2L, managerId);

            assertThat(result.getStatus()).isEqualTo(TimesheetStatus.APPROVED);
            assertThat(submittedTimesheet.getStatus()).isEqualTo(TimesheetStatus.APPROVED);
            assertThat(submittedTimesheet.getApprovedBy()).isEqualTo(managerId);
            assertThat(submittedTimesheet.getApprovedAt()).isNotNull();
            assertThat(submittedTimesheet.getRejectionReason()).isNull();

            verify(eventPublisher).publishEvent(any(TimesheetApprovedEvent.class));
        }

        @Test
        @DisplayName("should throw when approving non-SUBMITTED timesheet")
        void approveTimesheet_NonSubmitted_ThrowsException() {
            when(timesheetRepository.findById(1L)).thenReturn(Optional.of(draftTimesheet));
            doThrow(new InvalidTimesheetStateException("Only SUBMITTED timesheets can be approved"))
                    .when(timesheetValidator).validateTimesheetCanBeApproved(draftTimesheet);

            assertThatThrownBy(() -> timesheetService.approveTimesheet(1L, managerId))
                    .isInstanceOf(InvalidTimesheetStateException.class);
        }
    }

    @Nested
    @DisplayName("RejectTimesheet")
    class RejectTimesheet {

        @Test
        @DisplayName("should reject SUBMITTED timesheet with reason")
        void rejectTimesheet_Success() {
            TimesheetResponse rejectedResponse = TimesheetResponse.builder()
                    .id(2L).userId(userId).status(TimesheetStatus.REJECTED)
                    .rejectionReason("Missing project details").build();

            when(timesheetRepository.findById(2L)).thenReturn(Optional.of(submittedTimesheet));
            doNothing().when(timesheetValidator).validateTimesheetCanBeApproved(submittedTimesheet);
            when(timesheetRepository.save(submittedTimesheet)).thenReturn(submittedTimesheet);
            when(timesheetMapper.toTimesheetResponse(submittedTimesheet)).thenReturn(rejectedResponse);
            when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));

            TimesheetResponse result = timesheetService.rejectTimesheet(2L, managerId, "Missing project details");

            assertThat(submittedTimesheet.getStatus()).isEqualTo(TimesheetStatus.REJECTED);
            assertThat(submittedTimesheet.getRejectionReason()).isEqualTo("Missing project details");
            assertThat(submittedTimesheet.getApprovedBy()).isEqualTo(managerId);

            ArgumentCaptor<TimesheetApprovedEvent> eventCaptor =
                    ArgumentCaptor.forClass(TimesheetApprovedEvent.class);
            verify(eventPublisher).publishEvent(eventCaptor.capture());
            assertThat(eventCaptor.getValue().isApproved()).isFalse();
        }
    }

    @Nested
    @DisplayName("LockTimesheet")
    class LockTimesheet {

        @Test
        @DisplayName("should lock APPROVED timesheet successfully")
        void lockTimesheet_Success() {
            TimesheetResponse lockedResponse = TimesheetResponse.builder()
                    .id(3L).userId(userId).status(TimesheetStatus.LOCKED).build();

            when(timesheetRepository.findById(3L)).thenReturn(Optional.of(approvedTimesheet));
            doNothing().when(timesheetValidator).validateTimesheetCanBeLocked(approvedTimesheet);
            when(timesheetRepository.save(approvedTimesheet)).thenReturn(approvedTimesheet);
            when(timesheetMapper.toTimesheetResponse(approvedTimesheet)).thenReturn(lockedResponse);

            TimesheetResponse result = timesheetService.lockTimesheet(3L);

            assertThat(approvedTimesheet.getStatus()).isEqualTo(TimesheetStatus.LOCKED);
        }

        @Test
        @DisplayName("should throw when locking non-APPROVED timesheet")
        void lockTimesheet_NonApproved_ThrowsException() {
            when(timesheetRepository.findById(2L)).thenReturn(Optional.of(submittedTimesheet));
            doThrow(new InvalidTimesheetStateException("Only APPROVED timesheets can be locked"))
                    .when(timesheetValidator).validateTimesheetCanBeLocked(submittedTimesheet);

            assertThatThrownBy(() -> timesheetService.lockTimesheet(2L))
                    .isInstanceOf(InvalidTimesheetStateException.class);
        }

        @Test
        @DisplayName("should throw ResourceNotFoundException when timesheet not found")
        void lockTimesheet_NotFound_ThrowsException() {
            when(timesheetRepository.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> timesheetService.lockTimesheet(999L))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("OwnerAndManagerChecks")
    class OwnerAndManagerChecks {

        @Test
        @DisplayName("isOwnerOfTimesheet returns true for the actual owner")
        void isOwnerOfTimesheet_Owner_ReturnsTrue() {
            when(timesheetRepository.findById(1L)).thenReturn(Optional.of(draftTimesheet));
            when(userRepository.findByEmail("employee@company.com"))
                    .thenReturn(Optional.of(testUser));

            boolean result = timesheetService.isOwnerOfTimesheet("employee@company.com", 1L);

            assertThat(result).isTrue();
        }

        @Test
        @DisplayName("isOwnerOfTimesheet returns false for non-owner")
        void isOwnerOfTimesheet_NonOwner_ReturnsFalse() {
            User otherUser = User.builder().id(UUID.randomUUID()).email("other@company.com").build();

            when(timesheetRepository.findById(1L)).thenReturn(Optional.of(draftTimesheet));
            when(userRepository.findByEmail("other@company.com"))
                    .thenReturn(Optional.of(otherUser));

            boolean result = timesheetService.isOwnerOfTimesheet("other@company.com", 1L);

            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("isOwnerOfTimesheet returns false when timesheet not found")
        void isOwnerOfTimesheet_TimesheetNotFound_ReturnsFalse() {
            when(timesheetRepository.findById(999L)).thenReturn(Optional.empty());

            boolean result = timesheetService.isOwnerOfTimesheet("employee@company.com", 999L);

            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("isReportingManagerOfTimesheetOwner returns true for correct manager")
        void isReportingManagerOfTimesheetOwner_CorrectManager_ReturnsTrue() {
            when(timesheetRepository.findById(1L)).thenReturn(Optional.of(draftTimesheet));
            when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));
            when(userRepository.findByEmail("manager@company.com"))
                    .thenReturn(Optional.of(managerUser));

            boolean result = timesheetService.isReportingManagerOfTimesheetOwner(
                    "manager@company.com", 1L);

            assertThat(result).isTrue();
        }

        @Test
        @DisplayName("isReportingManagerOfTimesheetOwner returns false for wrong manager")
        void isReportingManagerOfTimesheetOwner_WrongManager_ReturnsFalse() {
            User wrongManager = User.builder().id(UUID.randomUUID())
                    .email("wrongmanager@company.com").build();

            when(timesheetRepository.findById(1L)).thenReturn(Optional.of(draftTimesheet));
            when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));
            when(userRepository.findByEmail("wrongmanager@company.com"))
                    .thenReturn(Optional.of(wrongManager));

            boolean result = timesheetService.isReportingManagerOfTimesheetOwner(
                    "wrongmanager@company.com", 1L);

            assertThat(result).isFalse();
        }
    }

    @Nested
    @DisplayName("GetTimesheetsByUser")
    class GetTimesheetsByUser {

        @Test
        @DisplayName("should return list of timesheets for user")
        void getTimesheetsByUser_Success() {
            when(timesheetRepository.findByUserId(userId))
                    .thenReturn(List.of(draftTimesheet, submittedTimesheet));
            when(timesheetMapper.toTimesheetResponse(draftTimesheet)).thenReturn(timesheetResponse);
            when(timesheetMapper.toTimesheetResponse(submittedTimesheet)).thenReturn(
                    TimesheetResponse.builder().id(2L).status(TimesheetStatus.SUBMITTED).build());

            List<TimesheetResponse> result = timesheetService.getTimesheetsByUser(userId);

            assertThat(result).hasSize(2);
        }
    }
}
