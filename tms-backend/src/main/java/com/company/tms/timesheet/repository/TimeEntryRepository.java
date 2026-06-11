package com.company.tms.timesheet.repository;

import com.company.tms.timesheet.entity.TimeEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface TimeEntryRepository extends JpaRepository<TimeEntry, Long> {

    List<TimeEntry> findByTimesheetId(Long timesheetId);

    List<TimeEntry> findByUserIdAndWorkDate(UUID userId, LocalDate workDate);

    boolean existsByTimesheetId(Long timesheetId);

    /**
     * Finds time entries that overlap with the given interval for a user on a specific date.
     * Pass excludeId = -1L when creating a new entry (nothing to exclude).
     *
     * Overlap condition: existing.startTime < newEndTime AND existing.endTime > newStartTime
     */
    @Query("SELECT te FROM TimeEntry te " +
           "WHERE te.userId = :userId " +
           "AND te.workDate = :workDate " +
           "AND te.startTime < :endTime " +
           "AND te.endTime > :startTime " +
           "AND te.id <> :excludeId")
    List<TimeEntry> findOverlappingEntries(
            @Param("userId") UUID userId,
            @Param("workDate") LocalDate workDate,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime,
            @Param("excludeId") Long excludeId);

    /**
     * Returns the total logged minutes for a user on a day, excluding a specific entry.
     * Pass excludeId = -1L when no exclusion is needed (new entry scenario).
     */
    @Query("SELECT COALESCE(SUM(te.durationMinutes), 0) FROM TimeEntry te " +
           "WHERE te.userId = :userId AND te.workDate = :workDate AND te.id <> :excludeId")
    Integer sumDurationMinutesByUserAndWorkDate(
            @Param("userId") UUID userId,
            @Param("workDate") LocalDate workDate,
            @Param("excludeId") Long excludeId);

    // ── Project-level aggregation queries ────────────────────────────────────

    /** Total minutes logged across all time entries for a project. */
    @Query("SELECT COALESCE(SUM(te.durationMinutes), 0) FROM TimeEntry te WHERE te.projectId = :projectId")
    Long sumDurationMinutesByProjectId(@Param("projectId") Long projectId);

    /**
     * Minutes logged only for time entries linked to an actual Task (taskId IS NOT NULL).
     * Used as the numerator for utilization % to avoid inflation from free-text entries.
     */
    @Query("SELECT COALESCE(SUM(te.durationMinutes), 0) FROM TimeEntry te WHERE te.projectId = :projectId AND te.taskId IS NOT NULL")
    Long sumDurationMinutesByProjectIdAndTaskLinked(@Param("projectId") Long projectId);

    /** Total minutes logged across all time entries for a timesheet. */
    @Query("SELECT COALESCE(SUM(te.durationMinutes), 0) FROM TimeEntry te WHERE te.timesheetId = :timesheetId")
    int sumDurationMinutesByTimesheetId(@Param("timesheetId") Long timesheetId);

    /** All time entries for a project (used for breakdown aggregation in the service layer). */
    @Query("SELECT te FROM TimeEntry te WHERE te.projectId = :projectId ORDER BY te.workDate")
    List<TimeEntry> findAllByProjectId(@Param("projectId") Long projectId);
}
