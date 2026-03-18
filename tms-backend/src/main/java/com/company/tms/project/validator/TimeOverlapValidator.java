package com.company.tms.project.validator;

import com.company.tms.exception.ValidationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

/**
 * Cross-module utility for detecting overlapping timesheet time entries for a user.
 *
 * <p>Business rule: On any given day a user's tracked work periods must NOT overlap.
 * For example:
 * <ul>
 *   <li>ALLOWED  – Project A 09:00–12:00, Project B 13:00–17:00</li>
 *   <li>FORBIDDEN – Project A 09:00–12:00, Project B 11:00–15:00 (overlap 11:00–12:00)</li>
 * </ul>
 *
 * <p>This component is intentionally placed in the {@code project} module because the
 * Project Assignment service is the first consumer.  The Timesheet module reuses it
 * by injecting this bean directly — no code duplication needed.
 *
 * <p>Uses a native SQL query so that it compiles and loads even before the
 * {@code TimesheetEntry} JPA entity exists.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class TimeOverlapValidator {

    private static final String OVERLAP_CHECK_SQL = """
            SELECT COUNT(*)
            FROM timesheet_entries te
            INNER JOIN timesheets t ON te.timesheet_id = t.id
            WHERE t.user_id = ?
              AND te.date = ?
              AND te.check_in  < ?
              AND te.check_out > ?
            """;

    private final JdbcTemplate jdbcTemplate;

    /**
     * Validates that the proposed time slot does not overlap with any existing
     * timesheet entry logged by {@code userId} on {@code date}.
     *
     * <p>An overlap is defined as: {@code existing.checkIn < end && existing.checkOut > start}.
     *
     * @param date   the calendar day being validated
     * @param start  proposed check-in time (inclusive)
     * @param end    proposed check-out time (exclusive upper bound)
     * @param userId the user whose entries will be scanned
     * @throws ValidationException if an overlapping entry is found
     * @throws IllegalArgumentException if {@code start} is not before {@code end}
     */
    public void validateTimeOverlap(LocalDate date, LocalTime start, LocalTime end, UUID userId) {
        log.debug("Validating time overlap for userId={}, date={}, start={}, end={}", userId, date, start, end);

        if (!start.isBefore(end)) {
            throw new IllegalArgumentException("Check-in time must be before check-out time");
        }

        Integer count = jdbcTemplate.queryForObject(
                OVERLAP_CHECK_SQL,
                Integer.class,
                userId.toString(),
                date,
                end,
                start
        );

        if (count != null && count > 0) {
            log.warn("Time overlap detected for userId={}, date={}, {}-{}", userId, date, start, end);
            throw new ValidationException(
                    String.format(
                            "Time entry %s–%s on %s overlaps with an existing entry for this user",
                            start, end, date));
        }
    }
}
