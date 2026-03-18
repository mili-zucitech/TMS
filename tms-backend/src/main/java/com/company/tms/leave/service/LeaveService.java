package com.company.tms.leave.service;

import com.company.tms.exception.ResourceNotFoundException;
import com.company.tms.exception.ValidationException;
import com.company.tms.leave.dto.LeaveRequestCreateRequest;
import com.company.tms.leave.dto.LeaveRequestResponse;
import com.company.tms.leave.entity.Leave;
import com.company.tms.leave.entity.LeaveStatus;
import com.company.tms.leave.entity.LeaveType;
import com.company.tms.leave.mapper.LeaveMapper;
import com.company.tms.leave.repository.LeaveRepository;
import com.company.tms.leave.repository.LeaveTypeRepository;
import com.company.tms.leave.validator.LeaveValidator;
import com.company.tms.user.entity.User;
import com.company.tms.user.repository.UserRepository;
import com.company.tms.notification.event.LeaveAppliedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LeaveService {

    private final LeaveRepository leaveRepository;
    private final LeaveTypeRepository leaveTypeRepository;
    private final LeaveMapper leaveMapper;
    private final LeaveValidator leaveValidator;
    private final LeaveBalanceService leaveBalanceService;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * Creates a new PENDING leave request.
     * Validates: leave type exists, date range, sufficient balance, no overlap with approved leaves.
     */
    @Transactional
    public LeaveRequestResponse createLeaveRequest(LeaveRequestCreateRequest request) {
        log.info("Creating leave request for user {} from {} to {}",
                request.getUserId(), request.getStartDate(), request.getEndDate());

        leaveValidator.validateLeaveTypeExists(request.getLeaveTypeId());
        leaveValidator.validateDateRange(request.getStartDate(), request.getEndDate());

        int totalDays = leaveValidator.calculateTotalDays(request.getStartDate(), request.getEndDate());
        leaveValidator.validateSufficientBalance(request.getUserId(), request.getLeaveTypeId(), totalDays);
        leaveValidator.validateNoApprovedLeaveOverlap(
                request.getUserId(), request.getStartDate(), request.getEndDate(), -1L);

        Leave leave = leaveMapper.toLeaveEntity(request);
        leave.setTotalDays(totalDays);
        leave.setStatus(LeaveStatus.PENDING);

        Leave saved = leaveRepository.save(leave);
        log.info("Leave request created with id: {}", saved.getId());

        userRepository.findById(saved.getUserId()).ifPresent(applicant ->
                eventPublisher.publishEvent(new LeaveAppliedEvent(
                        this, applicant.getId(), saved.getId(),
                        applicant.getEmail(), applicant.getName(), applicant.getManagerId()
                ))
        );

        return enrichWithLeaveTypeName(leaveMapper.toLeaveRequestResponse(saved));
    }

    /**
     * Cancels a PENDING leave request. Only the owner can cancel.
     */
    @Transactional
    public LeaveRequestResponse cancelLeaveRequest(Long id) {
        log.info("Cancelling leave request {}", id);
        Leave leave = getExistingLeave(id);
        leaveValidator.validateLeaveIsPending(leave.getStatus(), id);

        leave.setStatus(LeaveStatus.CANCELLED);
        log.info("Leave request {} cancelled", id);
        return enrichWithLeaveTypeName(leaveMapper.toLeaveRequestResponse(leaveRepository.save(leave)));
    }

    /**
     * Approves a PENDING leave request and deducts from the user's leave balance.
     */
    @Transactional
    public LeaveRequestResponse approveLeaveRequest(Long id, UUID approverId) {
        log.info("Approving leave request {} by {}", id, approverId);
        Leave leave = getExistingLeave(id);
        leaveValidator.validateLeaveIsPending(leave.getStatus(), id);

        leave.setStatus(LeaveStatus.APPROVED);
        leave.setApprovedAt(LocalDateTime.now());
        leave.setApprovedBy(approverId);
        leave.setRejectionReason(null);

        leaveBalanceService.deductLeaveBalance(
                leave.getUserId(), leave.getLeaveTypeId(), leave.getTotalDays());

        log.info("Leave request {} approved", id);
        return enrichWithLeaveTypeName(leaveMapper.toLeaveRequestResponse(leaveRepository.save(leave)));
    }

    /**
     * Rejects a PENDING leave request with a mandatory reason.
     */
    @Transactional
    public LeaveRequestResponse rejectLeaveRequest(Long id, UUID approverId, String rejectionReason) {
        log.info("Rejecting leave request {} by {}", id, approverId);
        Leave leave = getExistingLeave(id);
        leaveValidator.validateLeaveIsPending(leave.getStatus(), id);

        leave.setStatus(LeaveStatus.REJECTED);
        leave.setApprovedBy(approverId);
        leave.setRejectionReason(rejectionReason);
        log.info("Leave request {} rejected", id);
        return enrichWithLeaveTypeName(leaveMapper.toLeaveRequestResponse(leaveRepository.save(leave)));
    }

    public List<LeaveRequestResponse> getLeaveRequestsByUser(UUID userId) {
        return leaveRepository.findByUserId(userId).stream()
                .map(leaveMapper::toLeaveRequestResponse)
                .map(this::enrichWithLeaveTypeName)
                .collect(Collectors.toList());
    }

    public List<LeaveRequestResponse> getLeaveRequestsByManager(UUID managerId) {
        List<User> reportees = userRepository.findByManagerId(managerId);
        Map<UUID, String> nameMap = reportees.stream()
                .collect(Collectors.toMap(User::getId, User::getName));

        List<UUID> reporteeIds = reportees.stream()
                .map(User::getId)
                .collect(Collectors.toList());

        return leaveRepository.findByUserIdIn(reporteeIds).stream()
                .map(leaveMapper::toLeaveRequestResponse)
                .map(this::enrichWithLeaveTypeName)
                .peek(r -> r.setEmployeeName(nameMap.get(r.getUserId())))
                .collect(Collectors.toList());
    }

    public List<LeaveRequestResponse> getLeaveRequestsByStatus(LeaveStatus status) {
        return leaveRepository.findByStatus(status).stream()
                .map(leaveMapper::toLeaveRequestResponse)
                .map(this::enrichWithLeaveTypeName)
                .collect(Collectors.toList());
    }

    Leave getExistingLeave(Long id) {
        return leaveRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("LeaveRequest", "id", id));
    }

    private LeaveRequestResponse enrichWithLeaveTypeName(LeaveRequestResponse response) {
        leaveTypeRepository.findById(response.getLeaveTypeId())
                .ifPresent(lt -> response.setLeaveTypeName(lt.getName()));
        return response;
    }
}

