package com.company.tms.leave.repository;

import com.company.tms.leave.entity.Leave;
import com.company.tms.leave.entity.LeaveStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface LeaveRepository extends JpaRepository<Leave, Long> {

    List<Leave> findByUserId(UUID userId);

    List<Leave> findByUserIdIn(Collection<UUID> userIds);

    List<Leave> findByUserIdAndStatus(UUID userId, LeaveStatus status);

    List<Leave> findByStatus(LeaveStatus status);

    /**
     * Finds approved leave requests that overlap with the given date range for a user.
     * Overlap: existing.startDate <= newEndDate AND existing.endDate >= newStartDate
     */
    @Query("SELECT l FROM Leave l " +
           "WHERE l.userId = :userId " +
           "AND l.status = 'APPROVED' " +
           "AND l.startDate <= :endDate " +
           "AND l.endDate >= :startDate " +
           "AND l.id <> :excludeId")
    List<Leave> findApprovedOverlappingLeaves(
            @Param("userId") UUID userId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("excludeId") Long excludeId);

    /**
     * Checks whether an approved leave covers the given workDate (for timesheet conflict check).
     */
    @Query("SELECT COUNT(l) > 0 FROM Leave l " +
           "WHERE l.userId = :userId " +
           "AND l.status = 'APPROVED' " +
           "AND l.startDate <= :workDate " +
           "AND l.endDate >= :workDate")
    boolean existsApprovedLeaveOnDate(
            @Param("userId") UUID userId,
            @Param("workDate") LocalDate workDate);
}

