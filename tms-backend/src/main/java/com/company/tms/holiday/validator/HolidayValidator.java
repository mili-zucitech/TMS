package com.company.tms.holiday.validator;

import com.company.tms.exception.ValidationException;
import com.company.tms.holiday.exception.HolidayConflictException;
import com.company.tms.holiday.repository.HolidayRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Slf4j
@Component
@RequiredArgsConstructor
public class HolidayValidator {

    private final HolidayRepository holidayRepository;

    /**
     * Ensures no other holiday already exists on the given date (create).
     */
    public void validateDateUniqueness(LocalDate holidayDate) {
        if (holidayRepository.existsByHolidayDate(holidayDate)) {
            throw new ValidationException(
                    "A holiday already exists on date: " + holidayDate);
        }
    }

    /**
     * Ensures no OTHER holiday already exists on the given date (update).
     */
    public void validateDateUniquenessForUpdate(LocalDate holidayDate, Long holidayId) {
        if (holidayRepository.existsByHolidayDateAndIdNot(holidayDate, holidayId)) {
            throw new ValidationException(
                    "Another holiday already exists on date: " + holidayDate);
        }
    }

    // -------------------------------------------------------------------------
    // Timesheet integration
    // -------------------------------------------------------------------------

    /**
     * Throws {@link HolidayConflictException} if the given workDate falls on a holiday.
     * Called by the Timesheet module before allowing a time entry to be logged.
     */
    public void checkHolidayConflict(LocalDate workDate) {
        if (holidayRepository.existsByHolidayDate(workDate)) {
            throw new HolidayConflictException(
                    "Cannot log time on a holiday: " + workDate);
        }
    }

    // -------------------------------------------------------------------------
    // Leave integration
    // -------------------------------------------------------------------------

    /**
     * Counts the number of holidays within an inclusive date range.
     * Used by LeaveValidator to subtract public holidays from leave day totals.
     */
    public long countHolidaysInRange(LocalDate startDate, LocalDate endDate) {
        return holidayRepository.countByHolidayDateBetween(startDate, endDate);
    }
}
