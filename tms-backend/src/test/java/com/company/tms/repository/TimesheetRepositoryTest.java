package com.company.tms.repository;

import com.company.tms.timesheet.entity.TimeEntry;
import com.company.tms.timesheet.entity.Timesheet;
import com.company.tms.timesheet.entity.TimesheetStatus;
import com.company.tms.timesheet.repository.TimeEntryRepository;
import com.company.tms.timesheet.repository.TimesheetRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;

@DataJpaTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
@TestPropertySource(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
@DisplayName("TimesheetRepository Tests")
class TimesheetRepositoryTest {

    @Autowired TimesheetRepository timesheetRepository;
    @Autowired TimeEntryRepository timeEntryRepository;

    private UUID userId1;
    private UUID userId2;
    private LocalDate weekStart;
    private Timesheet draftSheet;
    private Timesheet submittedSheet;

    @BeforeEach
    void setUp() {
        userId1 = UUID.randomUUID();
        userId2 = UUID.randomUUID();
        weekStart = LocalDate.of(2026, 3, 16);

        draftSheet = timesheetRepository.save(Timesheet.builder()
                .userId(userId1)
                .weekStartDate(weekStart)
                .weekEndDate(weekStart.plusDays(6))
                .status(TimesheetStatus.DRAFT)
                .build());

        submittedSheet = timesheetRepository.save(Timesheet.builder()
                .userId(userId1)
                .weekStartDate(weekStart.minusWeeks(1))
                .weekEndDate(weekStart.minusWeeks(1).plusDays(6))
                .status(TimesheetStatus.SUBMITTED)
                .build());

        // A timesheet for a different user
        timesheetRepository.save(Timesheet.builder()
                .userId(userId2)
                .weekStartDate(weekStart)
                .weekEndDate(weekStart.plusDays(6))
                .status(TimesheetStatus.APPROVED)
                .build());
    }

    @Test
    @DisplayName("findByUserIdAndWeekStartDate returns correct timesheet")
    void findByUserIdAndWeekStartDate_Found() {
        Optional<Timesheet> result = timesheetRepository
                .findByUserIdAndWeekStartDate(userId1, weekStart);

        assertThat(result).isPresent();
        assertThat(result.get().getStatus()).isEqualTo(TimesheetStatus.DRAFT);
    }

    @Test
    @DisplayName("findByUserIdAndWeekStartDate returns empty for wrong week")
    void findByUserIdAndWeekStartDate_WrongWeek_Empty() {
        Optional<Timesheet> result = timesheetRepository
                .findByUserIdAndWeekStartDate(userId1, weekStart.plusWeeks(1));

        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("findByUserId returns all timesheets for user")
    void findByUserId_ReturnsAll() {
        List<Timesheet> result = timesheetRepository.findByUserId(userId1);

        assertThat(result).hasSize(2);
    }

    @Test
    @DisplayName("findByStatus returns only timesheets with that status")
    void findByStatus_Submitted_ReturnsSubmittedOnly() {
        List<Timesheet> result = timesheetRepository.findByStatus(TimesheetStatus.SUBMITTED);

        assertThat(result).isNotEmpty();
        assertThat(result).allMatch(ts -> ts.getStatus() == TimesheetStatus.SUBMITTED);
    }

    // ============================================================
    // TimeEntryRepository tests
    // ============================================================

    @Test
    @DisplayName("existsByTimesheetId returns true when entries exist")
    void existsByTimesheetId_EntryExists_ReturnsTrue() {
        timeEntryRepository.save(TimeEntry.builder()
                .timesheetId(draftSheet.getId())
                .projectId(1L)
                .userId(userId1)
                .workDate(weekStart)
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(12, 0))
                .durationMinutes(180)
                .build());

        boolean exists = timeEntryRepository.existsByTimesheetId(draftSheet.getId());

        assertThat(exists).isTrue();
    }

    @Test
    @DisplayName("existsByTimesheetId returns false when no entries")
    void existsByTimesheetId_NoEntries_ReturnsFalse() {
        boolean exists = timeEntryRepository.existsByTimesheetId(submittedSheet.getId());

        assertThat(exists).isFalse();
    }

    @Test
    @DisplayName("findByTimesheetId returns entries for timesheet")
    void findByTimesheetId_ReturnsEntries() {
        TimeEntry e1 = timeEntryRepository.save(TimeEntry.builder()
                .timesheetId(draftSheet.getId())
                .projectId(1L)
                .userId(userId1)
                .workDate(weekStart)
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(12, 0))
                .durationMinutes(180)
                .build());

        TimeEntry e2 = timeEntryRepository.save(TimeEntry.builder()
                .timesheetId(draftSheet.getId())
                .projectId(1L)
                .userId(userId1)
                .workDate(weekStart.plusDays(1))
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(17, 0))
                .durationMinutes(480)
                .build());

        List<TimeEntry> entries = timeEntryRepository.findByTimesheetId(draftSheet.getId());

        assertThat(entries).hasSize(2);
    }

    @Test
    @DisplayName("findOverlappingEntries detects overlap correctly")
    void findOverlappingEntries_Overlap_ReturnsEntries() {
        timeEntryRepository.save(TimeEntry.builder()
                .timesheetId(draftSheet.getId())
                .projectId(1L)
                .userId(userId1)
                .workDate(weekStart)
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(13, 0))
                .durationMinutes(240)
                .build());

        // 11:00–15:00 overlaps with 09:00–13:00
        List<TimeEntry> overlaps = timeEntryRepository.findOverlappingEntries(
                userId1, weekStart,
                LocalTime.of(11, 0), LocalTime.of(15, 0),
                -1L);

        assertThat(overlaps).hasSize(1);
    }

    @Test
    @DisplayName("findOverlappingEntries returns empty when no overlap")
    void findOverlappingEntries_NoOverlap_ReturnsEmpty() {
        timeEntryRepository.save(TimeEntry.builder()
                .timesheetId(draftSheet.getId())
                .projectId(1L)
                .userId(userId1)
                .workDate(weekStart)
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(12, 0))
                .durationMinutes(180)
                .build());

        // 13:00–17:00 does NOT overlap with 09:00–12:00
        List<TimeEntry> overlaps = timeEntryRepository.findOverlappingEntries(
                userId1, weekStart,
                LocalTime.of(13, 0), LocalTime.of(17, 0),
                -1L);

        assertThat(overlaps).isEmpty();
    }

    @Test
    @DisplayName("findOverlappingEntries excludes the entry with given ID")
    void findOverlappingEntries_ExcludesTargetEntry() {
        TimeEntry existing = timeEntryRepository.save(TimeEntry.builder()
                .timesheetId(draftSheet.getId())
                .projectId(1L)
                .userId(userId1)
                .workDate(weekStart)
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(13, 0))
                .durationMinutes(240)
                .build());

        // Same slot but excluding self — should return empty
        List<TimeEntry> overlaps = timeEntryRepository.findOverlappingEntries(
                userId1, weekStart,
                LocalTime.of(10, 0), LocalTime.of(12, 0),
                existing.getId());

        assertThat(overlaps).isEmpty();
    }

    @Test
    @DisplayName("sumDurationMinutesByUserAndWorkDate returns total minutes for a day")
    void sumDurationMinutes_ReturnsTotalForDay() {
        timeEntryRepository.save(TimeEntry.builder()
                .timesheetId(draftSheet.getId())
                .projectId(1L)
                .userId(userId1)
                .workDate(weekStart)
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(13, 0))
                .durationMinutes(240)
                .build());

        timeEntryRepository.save(TimeEntry.builder()
                .timesheetId(draftSheet.getId())
                .projectId(2L)
                .userId(userId1)
                .workDate(weekStart)
                .startTime(LocalTime.of(14, 0))
                .endTime(LocalTime.of(17, 0))
                .durationMinutes(180)
                .build());

        Integer total = timeEntryRepository.sumDurationMinutesByUserAndWorkDate(
                userId1, weekStart, -1L);

        assertThat(total).isEqualTo(420); // 240 + 180
    }

    @Test
    @DisplayName("sumDurationMinutesByUserAndWorkDate returns 0 when no entries")
    void sumDurationMinutes_NoEntries_ReturnsZero() {
        Integer total = timeEntryRepository.sumDurationMinutesByUserAndWorkDate(
                userId1, weekStart.plusDays(10), -1L);

        assertThat(total).isEqualTo(0);
    }
}
