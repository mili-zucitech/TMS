package com.company.tms.leave.repository;

import com.company.tms.leave.entity.LeaveBalance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LeaveBalanceRepository extends JpaRepository<LeaveBalance, Long> {

    Optional<LeaveBalance> findByUserIdAndLeaveTypeIdAndYear(UUID userId, Long leaveTypeId, Integer year);

    List<LeaveBalance> findByUserIdAndYear(UUID userId, Integer year);

    List<LeaveBalance> findByUserId(UUID userId);
}
