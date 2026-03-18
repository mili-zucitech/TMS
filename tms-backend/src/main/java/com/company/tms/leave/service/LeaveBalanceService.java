package com.company.tms.leave.service;

import com.company.tms.exception.ResourceNotFoundException;
import com.company.tms.leave.dto.LeaveBalanceResponse;
import com.company.tms.leave.entity.LeaveBalance;
import com.company.tms.leave.entity.LeaveType;
import com.company.tms.leave.mapper.LeaveMapper;
import com.company.tms.leave.repository.LeaveBalanceRepository;
import com.company.tms.leave.repository.LeaveTypeRepository;
import com.company.tms.user.entity.User;
import com.company.tms.user.entity.UserStatus;
import com.company.tms.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LeaveBalanceService {

    private final LeaveBalanceRepository leaveBalanceRepository;
    private final LeaveTypeRepository leaveTypeRepository;
    private final LeaveMapper leaveMapper;
    private final UserRepository userRepository;

    /**
     * Returns all leave balances for a user in the current year.
     */
    public List<LeaveBalanceResponse> getUserLeaveBalances(UUID userId) {
        int year = LocalDate.now().getYear();
        log.debug("Fetching leave balances for user {} year {}", userId, year);
        return leaveBalanceRepository.findByUserIdAndYear(userId, year).stream()
                .map(leaveMapper::toLeaveBalanceResponse)
                .map(this::enrichWithLeaveTypeName)
                .collect(Collectors.toList());
    }

    /**
     * Deducts approved leave days from the user's balance.
     * Called internally by LeaveService after approval.
     */
    @Transactional
    public void deductLeaveBalance(UUID userId, Long leaveTypeId, int days) {
        int year = LocalDate.now().getYear();
        log.info("Deducting {} day(s) from balance for user {} leaveType {} year {}",
                days, userId, leaveTypeId, year);
        LeaveBalance balance = leaveBalanceRepository
                .findByUserIdAndLeaveTypeIdAndYear(userId, leaveTypeId, year)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "LeaveBalance", "userId/leaveTypeId/year",
                        userId + "/" + leaveTypeId + "/" + year));

        balance.setUsedLeaves(balance.getUsedLeaves() + days);
        balance.setRemainingLeaves(balance.getTotalAllocated() - balance.getUsedLeaves());
        leaveBalanceRepository.save(balance);
    }

    /**
     * Creates leave-balance records for every ACTIVE user × every leave type
     * for the given year, skipping combinations that already exist.
     */
    @Transactional
    public int initializeLeaveBalancesForYear(int year) {
        List<User> activeUsers = userRepository.findByStatus(UserStatus.ACTIVE);
        List<LeaveType> leaveTypes = leaveTypeRepository.findAll();
        int created = 0;
        for (User user : activeUsers) {
            for (LeaveType lt : leaveTypes) {
                boolean exists = leaveBalanceRepository
                        .findByUserIdAndLeaveTypeIdAndYear(user.getId(), lt.getId(), year)
                        .isPresent();
                if (!exists) {
                    leaveBalanceRepository.save(LeaveBalance.builder()
                            .userId(user.getId())
                            .leaveTypeId(lt.getId())
                            .year(year)
                            .totalAllocated(lt.getDefaultAnnualAllocation())
                            .usedLeaves(0)
                            .remainingLeaves(lt.getDefaultAnnualAllocation())
                            .build());
                    created++;
                }
            }
        }
        log.info("Initialized {} leave-balance records for year {}", created, year);
        return created;
    }

    private LeaveBalanceResponse enrichWithLeaveTypeName(LeaveBalanceResponse response) {
        leaveTypeRepository.findById(response.getLeaveTypeId())
                .ifPresent(lt -> response.setLeaveTypeName(lt.getName()));
        return response;
    }
}
