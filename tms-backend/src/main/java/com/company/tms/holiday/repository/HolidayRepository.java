package com.company.tms.holiday.repository;

import com.company.tms.holiday.entity.Holiday;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface HolidayRepository extends JpaRepository<Holiday, Long> {

    Optional<Holiday> findByHolidayDate(LocalDate holidayDate);

    List<Holiday> findByHolidayDateBetween(LocalDate startDate, LocalDate endDate);

    boolean existsByHolidayDate(LocalDate holidayDate);

    boolean existsByHolidayDateAndIdNot(LocalDate holidayDate, Long id);

    /**
     * Counts how many holidays fall within the given inclusive date range.
     * Used by LeaveValidator to exclude holidays from leave day calculation.
     */
    long countByHolidayDateBetween(LocalDate startDate, LocalDate endDate);
}
