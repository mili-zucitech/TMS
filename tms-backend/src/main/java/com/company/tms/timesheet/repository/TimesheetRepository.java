package com.company.tms.timesheet.repository;

import com.company.tms.timesheet.entity.Timesheet;
import com.company.tms.timesheet.entity.TimesheetStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TimesheetRepository extends JpaRepository<Timesheet, Long> {

    Optional<Timesheet> findByUserIdAndWeekStartDate(UUID userId, LocalDate weekStartDate);

    List<Timesheet> findByUserId(UUID userId);

    List<Timesheet> findByUserIdAndStatus(UUID userId, TimesheetStatus status);

    List<Timesheet> findByStatus(TimesheetStatus status);
}

