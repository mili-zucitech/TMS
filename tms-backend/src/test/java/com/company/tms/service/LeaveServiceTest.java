package com.company.tms.service;

import com.company.tms.exception.ResourceNotFoundException;
import com.company.tms.exception.ValidationException;
import com.company.tms.leave.dto.LeaveRequestCreateRequest;
import com.company.tms.leave.dto.LeaveRequestResponse;
import com.company.tms.leave.entity.Leave;
import com.company.tms.leave.entity.LeaveStatus;
import com.company.tms.leave.exception.InsufficientLeaveBalanceException;
import com.company.tms.leave.exception.LeaveOverlapException;
import com.company.tms.leave.mapper.LeaveMapper;
import com.company.tms.leave.repository.LeaveRepository;
import com.company.tms.leave.repository.LeaveTypeRepository;
import com.company.tms.leave.service.LeaveBalanceService;
import com.company.tms.leave.service.LeaveService;
import com.company.tms.leave.validator.LeaveValidator;
import com.company.tms.notification.event.LeaveAppliedEvent;
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
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("LeaveService Unit Tests")
class LeaveServiceTest {

    @Mock private LeaveRepository leaveRepository;
    @Mock private LeaveTypeRepository leaveTypeRepository;
    @Mock private LeaveMapper leaveMapper;
    @Mock private LeaveValidator leaveValidator;
    @Mock private LeaveBalanceService leaveBalanceService;
    @Mock private UserRepository userRepository;
    @Mock private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private LeaveService leaveService;

    private UUID userId;
    private UUID managerId;
    private UUID approverId;
    private User testUser;
    private Leave pendingLeave;
    private LeaveRequestResponse leaveResponse;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        managerId = UUID.randomUUID();
        approverId = UUID.randomUUID();

        testUser = User.builder()
                .id(userId)
                .email("employee@company.com")
                .name("John Employee")
                .managerId(managerId)
                .build();

        pendingLeave = Leave.builder()
                .id(1L)
                .userId(userId)
                .leaveTypeId(1L)
                .startDate(LocalDate.of(2026, 4, 1))
                .endDate(LocalDate.of(2026, 4, 3))
                .totalDays(3)
                .reason("Medical appointment")
                .status(LeaveStatus.PENDING)
                .build();

        leaveResponse = LeaveRequestResponse.builder()
                .id(1L)
                .userId(userId)
                .leaveTypeId(1L)
                .startDate(LocalDate.of(2026, 4, 1))
                .endDate(LocalDate.of(2026, 4, 3))
                .totalDays(3)
                .reason("Medical appointment")
                .status(LeaveStatus.PENDING)
                .build();
    }

    @Nested
    @DisplayName("CreateLeaveRequest")
    class CreateLeaveRequest {

        @Test
        @DisplayName("should create PENDING leave request and publish LeaveAppliedEvent")
        void createLeaveRequest_Success() {
            LeaveRequestCreateRequest request = new LeaveRequestCreateRequest(
                    userId, 1L,
                    LocalDate.of(2026, 4, 1),
                    LocalDate.of(2026, 4, 3),
                    "Medical appointment");

            doNothing().when(leaveValidator).validateLeaveTypeExists(1L);
            doNothing().when(leaveValidator).validateDateRange(any(), any());
            when(leaveValidator.calculateTotalDays(any(), any())).thenReturn(3);
            doNothing().when(leaveValidator).validateSufficientBalance(userId, 1L, 3);
            doNothing().when(leaveValidator).validateNoApprovedLeaveOverlap(any(), any(), any(), anyLong());
            when(leaveMapper.toLeaveEntity(request)).thenReturn(pendingLeave);
            when(leaveRepository.save(any(Leave.class))).thenReturn(pendingLeave);
            when(leaveMapper.toLeaveRequestResponse(pendingLeave)).thenReturn(leaveResponse);
            when(leaveTypeRepository.findById(1L)).thenReturn(Optional.empty());
            when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));

            LeaveRequestResponse result = leaveService.createLeaveRequest(request);

            assertThat(result).isNotNull();
            assertThat(result.getStatus()).isEqualTo(LeaveStatus.PENDING);
            assertThat(pendingLeave.getTotalDays()).isEqualTo(3);
            assertThat(pendingLeave.getStatus()).isEqualTo(LeaveStatus.PENDING);

            ArgumentCaptor<LeaveAppliedEvent> eventCaptor =
                    ArgumentCaptor.forClass(LeaveAppliedEvent.class);
            verify(eventPublisher).publishEvent(eventCaptor.capture());
            LeaveAppliedEvent event = eventCaptor.getValue();
            assertThat(event.getApplicantUserId()).isEqualTo(userId);
            assertThat(event.getManagerId()).isEqualTo(managerId);
        }

        @Test
        @DisplayName("should throw InsufficientLeaveBalanceException when balance is insufficient")
        void createLeaveRequest_InsufficientBalance_ThrowsException() {
            LeaveRequestCreateRequest request = new LeaveRequestCreateRequest(
                    userId, 1L,
                    LocalDate.of(2026, 4, 1),
                    LocalDate.of(2026, 4, 15),
                    "Vacation");

            doNothing().when(leaveValidator).validateLeaveTypeExists(1L);
            doNothing().when(leaveValidator).validateDateRange(any(), any());
            when(leaveValidator.calculateTotalDays(any(), any())).thenReturn(15);
            doThrow(new InsufficientLeaveBalanceException("Insufficient leave balance. Requested: 15, Available: 5"))
                    .when(leaveValidator).validateSufficientBalance(userId, 1L, 15);

            assertThatThrownBy(() -> leaveService.createLeaveRequest(request))
                    .isInstanceOf(InsufficientLeaveBalanceException.class)
                    .hasMessageContaining("Insufficient leave balance");

            verify(leaveRepository, never()).save(any());
            verify(eventPublisher, never()).publishEvent(any());
        }

        @Test
        @DisplayName("should throw LeaveOverlapException when leaves overlap")
        void createLeaveRequest_Overlap_ThrowsException() {
            LeaveRequestCreateRequest request = new LeaveRequestCreateRequest(
                    userId, 1L,
                    LocalDate.of(2026, 4, 1),
                    LocalDate.of(2026, 4, 3),
                    "Personal");

            doNothing().when(leaveValidator).validateLeaveTypeExists(1L);
            doNothing().when(leaveValidator).validateDateRange(any(), any());
            when(leaveValidator.calculateTotalDays(any(), any())).thenReturn(3);
            doNothing().when(leaveValidator).validateSufficientBalance(any(), anyLong(), anyInt());
            doThrow(new LeaveOverlapException("Leave dates overlap with existing approved leave"))
                    .when(leaveValidator).validateNoApprovedLeaveOverlap(any(), any(), any(), anyLong());

            assertThatThrownBy(() -> leaveService.createLeaveRequest(request))
                    .isInstanceOf(LeaveOverlapException.class)
                    .hasMessageContaining("overlap");

            verify(leaveRepository, never()).save(any());
        }

        @Test
        @DisplayName("should throw ResourceNotFoundException when leave type does not exist")
        void createLeaveRequest_LeaveTypeNotFound_ThrowsException() {
            LeaveRequestCreateRequest request = new LeaveRequestCreateRequest(
                    userId, 99L,
                    LocalDate.of(2026, 4, 1),
                    LocalDate.of(2026, 4, 3),
                    "Personal");

            doThrow(new ResourceNotFoundException("LeaveType", "id", 99L))
                    .when(leaveValidator).validateLeaveTypeExists(99L);

            assertThatThrownBy(() -> leaveService.createLeaveRequest(request))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("LeaveType");
        }
    }

    @Nested
    @DisplayName("CancelLeaveRequest")
    class CancelLeaveRequest {

        @Test
        @DisplayName("should cancel PENDING leave request")
        void cancelLeaveRequest_Success() {
            LeaveRequestResponse cancelledResponse = LeaveRequestResponse.builder()
                    .id(1L).userId(userId).status(LeaveStatus.CANCELLED).build();

            when(leaveRepository.findById(1L)).thenReturn(Optional.of(pendingLeave));
            doNothing().when(leaveValidator).validateLeaveIsPending(LeaveStatus.PENDING, 1L);
            when(leaveRepository.save(pendingLeave)).thenReturn(pendingLeave);
            when(leaveMapper.toLeaveRequestResponse(pendingLeave)).thenReturn(cancelledResponse);
            when(leaveTypeRepository.findById(any())).thenReturn(Optional.empty());

            LeaveRequestResponse result = leaveService.cancelLeaveRequest(1L);

            assertThat(pendingLeave.getStatus()).isEqualTo(LeaveStatus.CANCELLED);
        }

        @Test
        @DisplayName("should throw ValidationException when cancelling non-PENDING leave")
        void cancelLeaveRequest_NonPending_ThrowsValidationException() {
            Leave approvedLeave = Leave.builder()
                    .id(2L).userId(userId).status(LeaveStatus.APPROVED).build();

            when(leaveRepository.findById(2L)).thenReturn(Optional.of(approvedLeave));
            doThrow(new ValidationException("Leave request 2 cannot be actioned in status: APPROVED"))
                    .when(leaveValidator).validateLeaveIsPending(LeaveStatus.APPROVED, 2L);

            assertThatThrownBy(() -> leaveService.cancelLeaveRequest(2L))
                    .isInstanceOf(ValidationException.class)
                    .hasMessageContaining("APPROVED");
        }
    }

    @Nested
    @DisplayName("ApproveLeaveRequest")
    class ApproveLeaveRequest {

        @Test
        @DisplayName("should approve PENDING leave and deduct balance")
        void approveLeaveRequest_Success() {
            LeaveRequestResponse approvedResponse = LeaveRequestResponse.builder()
                    .id(1L).userId(userId).status(LeaveStatus.APPROVED)
                    .approvedBy(approverId).build();

            when(leaveRepository.findById(1L)).thenReturn(Optional.of(pendingLeave));
            doNothing().when(leaveValidator).validateLeaveIsPending(LeaveStatus.PENDING, 1L);
            doNothing().when(leaveBalanceService).deductLeaveBalance(userId, 1L, 3);
            when(leaveRepository.save(pendingLeave)).thenReturn(pendingLeave);
            when(leaveMapper.toLeaveRequestResponse(pendingLeave)).thenReturn(approvedResponse);
            when(leaveTypeRepository.findById(any())).thenReturn(Optional.empty());

            LeaveRequestResponse result = leaveService.approveLeaveRequest(1L, approverId);

            assertThat(pendingLeave.getStatus()).isEqualTo(LeaveStatus.APPROVED);
            assertThat(pendingLeave.getApprovedBy()).isEqualTo(approverId);
            assertThat(pendingLeave.getApprovedAt()).isNotNull();
            assertThat(pendingLeave.getRejectionReason()).isNull();
            verify(leaveBalanceService).deductLeaveBalance(userId, 1L, 3);
        }
    }

    @Nested
    @DisplayName("RejectLeaveRequest")
    class RejectLeaveRequest {

        @Test
        @DisplayName("should reject PENDING leave with reason")
        void rejectLeaveRequest_Success() {
            LeaveRequestResponse rejectedResponse = LeaveRequestResponse.builder()
                    .id(1L).userId(userId).status(LeaveStatus.REJECTED)
                    .rejectionReason("Insufficient staffing").build();

            when(leaveRepository.findById(1L)).thenReturn(Optional.of(pendingLeave));
            doNothing().when(leaveValidator).validateLeaveIsPending(LeaveStatus.PENDING, 1L);
            when(leaveRepository.save(pendingLeave)).thenReturn(pendingLeave);
            when(leaveMapper.toLeaveRequestResponse(pendingLeave)).thenReturn(rejectedResponse);
            when(leaveTypeRepository.findById(any())).thenReturn(Optional.empty());

            LeaveRequestResponse result = leaveService.rejectLeaveRequest(1L, approverId, "Insufficient staffing");

            assertThat(pendingLeave.getStatus()).isEqualTo(LeaveStatus.REJECTED);
            assertThat(pendingLeave.getRejectionReason()).isEqualTo("Insufficient staffing");
            assertThat(pendingLeave.getApprovedBy()).isEqualTo(approverId);
        }
    }

    @Nested
    @DisplayName("GetAllLeaveRequests")
    class GetAllLeaveRequests {

        private Authentication buildAuth(String email, String... roles) {
            Authentication auth = mock(Authentication.class);
            lenient().when(auth.getName()).thenReturn(email);
            Collection<GrantedAuthority> authorities = java.util.Arrays.stream(roles)
                    .map(r -> (GrantedAuthority) new SimpleGrantedAuthority("ROLE_" + r))
                    .toList();
            doReturn(authorities).when(auth).getAuthorities();
            return auth;
        }

        @Test
        @DisplayName("ADMIN should see all leave requests")
        void getAllLeaves_Admin_ReturnsAll() {
            Authentication adminAuth = buildAuth("admin@company.com", "ADMIN");

            when(leaveRepository.findAll()).thenReturn(List.of(pendingLeave));
            when(leaveMapper.toLeaveRequestResponse(pendingLeave)).thenReturn(leaveResponse);
            when(leaveTypeRepository.findById(1L)).thenReturn(Optional.empty());
            when(userRepository.findAllById(anyList())).thenReturn(List.of(testUser));

            List<LeaveRequestResponse> result = leaveService.getAllLeaveRequests(adminAuth, null);

            assertThat(result).hasSize(1);
        }

        @Test
        @DisplayName("EMPLOYEE should only see own leave requests")
        void getAllLeaves_Employee_SeesOnlyOwn() {
            Authentication employeeAuth = buildAuth("employee@company.com", "EMPLOYEE");

            when(userRepository.findByEmail("employee@company.com")).thenReturn(Optional.of(testUser));
            when(leaveRepository.findByUserId(userId)).thenReturn(List.of(pendingLeave));
            when(leaveMapper.toLeaveRequestResponse(pendingLeave)).thenReturn(leaveResponse);
            when(leaveTypeRepository.findById(1L)).thenReturn(Optional.empty());
            when(userRepository.findAllById(anyList())).thenReturn(List.of(testUser));

            List<LeaveRequestResponse> result = leaveService.getAllLeaveRequests(employeeAuth, null);

            assertThat(result).hasSize(1);
            verify(leaveRepository, never()).findAll();
        }

        @Test
        @DisplayName("MANAGER should see own and team leave requests")
        void getAllLeaves_Manager_SeesTeam() {
            UUID reporteeId = UUID.randomUUID();
            User reportee = User.builder().id(reporteeId).email("reportee@company.com").build();
            User managerUserObj = User.builder().id(managerId).email("manager@company.com").build();

            Authentication managerAuth = buildAuth("manager@company.com", "MANAGER");

            when(userRepository.findByEmail("manager@company.com")).thenReturn(Optional.of(managerUserObj));
            when(userRepository.findByManagerId(managerId)).thenReturn(List.of(reportee));
            when(leaveRepository.findByUserIdIn(anyList())).thenReturn(List.of(pendingLeave));
            when(leaveMapper.toLeaveRequestResponse(pendingLeave)).thenReturn(leaveResponse);
            when(leaveTypeRepository.findById(1L)).thenReturn(Optional.empty());
            when(userRepository.findAllById(anyList())).thenReturn(List.of(testUser));

            List<LeaveRequestResponse> result = leaveService.getAllLeaveRequests(managerAuth, null);

            assertThat(result).isNotEmpty();
            verify(leaveRepository, never()).findAll();
        }
    }
}
