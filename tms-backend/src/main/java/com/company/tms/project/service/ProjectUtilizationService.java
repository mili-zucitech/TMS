package com.company.tms.project.service;

import com.company.tms.exception.ResourceNotFoundException;
import com.company.tms.project.dto.*;
import com.company.tms.project.entity.Project;
import com.company.tms.project.repository.ProjectRepository;
import com.company.tms.task.entity.Task;
import com.company.tms.task.entity.TaskStatus;
import com.company.tms.task.repository.TaskRepository;
import com.company.tms.timesheet.entity.TimeEntry;
import com.company.tms.timesheet.repository.TimeEntryRepository;
import com.company.tms.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.time.temporal.IsoFields;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProjectUtilizationService {

    private final ProjectRepository  projectRepository;
    private final TaskRepository     taskRepository;
    private final TimeEntryRepository timeEntryRepository;
    private final UserRepository     userRepository;

    private static final DateTimeFormatter WEEK_FMT = DateTimeFormatter.ofPattern("YYYY-'W'ww");

    // ─────────────────────────────────────────────────────────────────────────
    // Main utilization summary
    // ─────────────────────────────────────────────────────────────────────────

    public ProjectUtilizationResponse getUtilization(Long projectId) {
        log.debug("Computing utilization for project {}", projectId);

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project", "id", projectId));

        // ── Total logged hours (all entries, shown for full visibility) ─────────
        long totalMinutes = timeEntryRepository.sumDurationMinutesByProjectId(projectId);
        double loggedHours = totalMinutes / 60.0;

        // ── Task-linked logged hours (used for utilization % numerator) ──────────
        long trackedMinutes = timeEntryRepository.sumDurationMinutesByProjectIdAndTaskLinked(projectId);
        double trackedLoggedHours = trackedMinutes / 60.0;

        // ── Estimated hours from tasks ────────────────────────────────────────
        List<Task> tasks = taskRepository.findByProjectId(projectId);
        double estimatedFromTasks = tasks.stream()
                .map(Task::getEstimatedHours)
                .filter(Objects::nonNull)
                .mapToDouble(BigDecimal::doubleValue)
                .sum();
        Double estimatedHours = estimatedFromTasks > 0 ? estimatedFromTasks : null;

        // ── Utilization % (task-linked hours vs task estimates) ───────────────
        Double utilizationPct = (estimatedHours != null && estimatedHours > 0)
                ? round2((trackedLoggedHours / estimatedHours) * 100.0)
                : null;

        // ── Task-based completion % ───────────────────────────────────────────
        int totalTasks = tasks.size();
        long completedTasks = tasks.stream()
                .filter(t -> t.getStatus() == TaskStatus.COMPLETED)
                .count();
        double completionPct = totalTasks > 0
                ? round2((completedTasks * 100.0) / totalTasks)
                : 0.0;

        // ── Health status ─────────────────────────────────────────────────────
        String health = computeHealth(utilizationPct);

        // ── Remaining hours ───────────────────────────────────────────────────
        Double remainingHours = (estimatedHours != null)
                ? round2(estimatedHours - loggedHours)
                : null;

        // ── Timeline: % of time elapsed ──────────────────────────────────────
        Double timeElapsedPct = computeTimeElapsed(project.getStartDate(), project.getEndDate());

        return ProjectUtilizationResponse.builder()
                .projectId(projectId)
                .projectName(project.getName())
                .projectStatus(project.getStatus().name())
                .totalEstimatedHours(estimatedHours != null ? round2(estimatedHours) : null)
                .totalLoggedHours(round2(loggedHours))
                .remainingHours(remainingHours)
                .utilizationPercentage(utilizationPct)
                .completionPercentage(completionPct)
                .timeElapsedPercentage(timeElapsedPct)
                .totalTasks(totalTasks)
                .completedTasks((int) completedTasks)
                .healthStatus(health)
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Breakdown by user / task / week
    // ─────────────────────────────────────────────────────────────────────────

    public ProjectBreakdownResponse getBreakdown(Long projectId) {
        log.debug("Computing breakdown for project {}", projectId);

        // Verify project exists
        if (!projectRepository.existsById(projectId)) {
            throw new ResourceNotFoundException("Project", "id", projectId);
        }

        List<TimeEntry> entries = timeEntryRepository.findAllByProjectId(projectId);

        // ── Hours by user ─────────────────────────────────────────────────────
        Map<UUID, Long> minutesByUser = entries.stream()
                .collect(Collectors.groupingBy(
                        TimeEntry::getUserId,
                        Collectors.summingLong(te -> te.getDurationMinutes() != null ? te.getDurationMinutes() : 0L)
                ));

        List<HoursByUserEntry> hoursByUser = minutesByUser.entrySet().stream()
                .map(e -> {
                    String name = userRepository.findById(e.getKey())
                            .map(u -> u.getName())
                            .orElse(e.getKey().toString());
                    return new HoursByUserEntry(e.getKey().toString(), name, round2(e.getValue() / 60.0));
                })
                .sorted(Comparator.comparingDouble(HoursByUserEntry::getHours).reversed())
                .collect(Collectors.toList());

        // ── Hours by task ─────────────────────────────────────────────────────
        Map<Long, Long> minutesByTask = entries.stream()
                .filter(te -> te.getTaskId() != null)
                .collect(Collectors.groupingBy(
                        TimeEntry::getTaskId,
                        Collectors.summingLong(te -> te.getDurationMinutes() != null ? te.getDurationMinutes() : 0L)
                ));

        // Fetch task titles in one shot
        List<Long> taskIds = new ArrayList<>(minutesByTask.keySet());
        Map<Long, String> taskTitles = taskRepository.findAllById(taskIds).stream()
                .collect(Collectors.toMap(Task::getId, Task::getTitle));

        List<HoursByTaskEntry> hoursByTask = minutesByTask.entrySet().stream()
                .map(e -> new HoursByTaskEntry(
                        e.getKey(),
                        taskTitles.getOrDefault(e.getKey(), "Task #" + e.getKey()),
                        round2(e.getValue() / 60.0)))
                .sorted(Comparator.comparingDouble(HoursByTaskEntry::getHours).reversed())
                .collect(Collectors.toList());

        // ── Hours by ISO week ─────────────────────────────────────────────────
        Map<String, Double> weekMap = new TreeMap<>();
        for (TimeEntry te : entries) {
            if (te.getWorkDate() == null) continue;
            int week = te.getWorkDate().get(IsoFields.WEEK_OF_WEEK_BASED_YEAR);
            int year = te.getWorkDate().get(IsoFields.WEEK_BASED_YEAR);
            String key = String.format("%d-W%02d", year, week);
            double hours = (te.getDurationMinutes() != null ? te.getDurationMinutes() : 0) / 60.0;
            weekMap.merge(key, hours, Double::sum);
        }
        List<HoursByWeekEntry> hoursByWeek = weekMap.entrySet().stream()
                .map(e -> new HoursByWeekEntry(e.getKey(), round2(e.getValue())))
                .collect(Collectors.toList());

        return ProjectBreakdownResponse.builder()
                .projectId(projectId)
                .hoursByUser(hoursByUser)
                .hoursByTask(hoursByTask)
                .hoursByWeek(hoursByWeek)
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────────────────────

    private String computeHealth(Double utilizationPct) {
        if (utilizationPct == null) return "N_A";
        if (utilizationPct > 100.0) return "RED";
        if (utilizationPct > 90.0)  return "YELLOW";
        return "GREEN";
    }

    private Double computeTimeElapsed(LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null) return null;
        long totalDays = ChronoUnit.DAYS.between(startDate, endDate);
        if (totalDays <= 0) return 100.0;
        LocalDate today = LocalDate.now();
        LocalDate clampedToday = today.isAfter(endDate) ? endDate : today;
        long elapsed = ChronoUnit.DAYS.between(startDate, clampedToday);
        return round2(Math.max(0, Math.min(100, (elapsed * 100.0) / totalDays)));
    }

    private static double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
