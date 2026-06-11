package com.company.tms.timesheet.repository;

import com.company.tms.timesheet.entity.Timesheet;
import com.company.tms.timesheet.entity.TimesheetStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TimesheetRepository extends JpaRepository<Timesheet, Long> {

    Optional<Timesheet> findByUserIdAndWeekStartDate(UUID userId, LocalDate weekStartDate);

    List<Timesheet> findByUserId(UUID userId);

    List<Timesheet> findByUserIdAndStatus(UUID userId, TimesheetStatus status);

    List<Timesheet> findByStatus(TimesheetStatus status);

    List<Timesheet> findByUserIdIn(Collection<UUID> userIds);

    /**
     * Returns timesheets for a user whose weekStartDate falls within an optional
     * date range. Either bound may be {@code null} to make it unbounded.
     */
    @Query("SELECT t FROM Timesheet t WHERE t.userId = :userId " +
           "AND (:from IS NULL OR t.weekStartDate >= :from) " +
           "AND (:to IS NULL OR t.weekStartDate <= :to) " +
           "ORDER BY t.weekStartDate DESC")
    List<Timesheet> findByUserIdAndWeekStartDateRange(
            @Param("userId") UUID userId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);
}

