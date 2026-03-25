package com.company.tms.leave.service;

import com.company.tms.exception.ResourceNotFoundException;
import com.company.tms.leave.dto.LeaveRequestCreateRequest;
import com.company.tms.leave.dto.LeaveRequestResponse;
import com.company.tms.leave.entity.Leave;
import com.company.tms.leave.entity.LeaveStatus;
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
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@SuppressWarnings("null")
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

    public List<LeaveRequestResponse> getAllLeaveRequests(Authentication auth, String statusFilter) {
        Set<String> roles = auth == null ? Set.of() : auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority).collect(Collectors.toSet());

        // Determine the optional status enum to filter by (null = no filter)
        LeaveStatus statusEnum = null;
        if (statusFilter != null && !statusFilter.isBlank()) {
            try {
                statusEnum = LeaveStatus.valueOf(statusFilter.toUpperCase());
            } catch (IllegalArgumentException ignored) {
                // invalid status string — treat as no filter
            }
        }

        boolean isPrivileged = roles.contains("ROLE_ADMIN") || roles.contains("ROLE_HR")
                || roles.contains("ROLE_HR_MANAGER") || roles.contains("ROLE_DIRECTOR");

        List<Leave> leaves;
        if (isPrivileged) {
            // Admins/HR see all leaves, filtered by status if provided
            leaves = statusEnum != null
                    ? leaveRepository.findByStatus(statusEnum)
                    : leaveRepository.findAll();
        } else {
            String email = auth != null ? auth.getName() : null;
            Optional<User> caller = email != null ? userRepository.findByEmail(email) : Optional.empty();
            if (caller.isEmpty()) {
                return List.of();
            }

            if (roles.contains("ROLE_MANAGER")) {
                // Managers see their team + themselves, filtered by status if provided
                List<UUID> teamIds = userRepository.findByManagerId(caller.get().getId())
                        .stream().map(User::getId).collect(Collectors.toList());
                teamIds.add(caller.get().getId());
                leaves = statusEnum != null
                        ? leaveRepository.findByUserIdInAndStatus(teamIds, statusEnum)
                        : leaveRepository.findByUserIdIn(teamIds);
            } else {
                // Regular employees see only their own leaves
                UUID selfId = caller.get().getId();
                leaves = statusEnum != null
                        ? leaveRepository.findByUserIdAndStatus(selfId, statusEnum)
                        : leaveRepository.findByUserId(selfId);
            }
        }

        List<UUID> userIds = leaves.stream().map(Leave::getUserId).distinct().collect(Collectors.toList());
        Map<UUID, String> nameMap = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, User::getName));

        return leaves.stream()
                .map(leaveMapper::toLeaveRequestResponse)
                .map(this::enrichWithLeaveTypeName)
                .peek(r -> r.setEmployeeName(nameMap.getOrDefault(r.getUserId(), r.getUserId().toString())))
                .collect(Collectors.toList());
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
        Long leaveTypeId = response.getLeaveTypeId();
        if (leaveTypeId != null) {
            leaveTypeRepository.findById(leaveTypeId)
                    .ifPresent(lt -> response.setLeaveTypeName(lt.getName()));
        }
        return response;
    }
}

