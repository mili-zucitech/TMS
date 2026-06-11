package com.company.tms.project;

import com.company.tms.exception.ResourceNotFoundException;
import com.company.tms.project.dto.ProjectBreakdownResponse;
import com.company.tms.project.dto.ProjectUtilizationResponse;
import com.company.tms.project.entity.Project;
import com.company.tms.project.entity.ProjectStatus;
import com.company.tms.project.repository.ProjectRepository;
import com.company.tms.project.service.ProjectUtilizationService;
import com.company.tms.task.entity.Task;
import com.company.tms.task.entity.TaskStatus;
import com.company.tms.task.repository.TaskRepository;
import com.company.tms.timesheet.entity.TimeEntry;
import com.company.tms.timesheet.repository.TimeEntryRepository;
import com.company.tms.user.entity.User;
import com.company.tms.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ProjectUtilizationService Unit Tests")
class ProjectUtilizationServiceTest {

    @Mock private ProjectRepository    projectRepository;
    @Mock private TaskRepository       taskRepository;
    @Mock private TimeEntryRepository  timeEntryRepository;
    @Mock private UserRepository       userRepository;

    @InjectMocks
    private ProjectUtilizationService service;

    private static final Long PROJECT_ID = 1L;
    private UUID userId;
    private Project project;
    private Task completedTask;
    private Task inProgressTask;
    private TimeEntry entry1;
    private TimeEntry entry2;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();

        project = Project.builder()
                .id(PROJECT_ID)
                .name("Test Project")
                .status(ProjectStatus.ACTIVE)
                .startDate(LocalDate.of(2026, 1, 1))
                .endDate(LocalDate.of(2026, 12, 31))
                .build();

        completedTask = Task.builder()
                .id(10L)
                .projectId(PROJECT_ID)
                .title("Task A")
                .status(TaskStatus.COMPLETED)
                .estimatedHours(BigDecimal.valueOf(40))
                .build();

        inProgressTask = Task.builder()
                .id(11L)
                .projectId(PROJECT_ID)
                .title("Task B")
                .status(TaskStatus.IN_PROGRESS)
                .estimatedHours(BigDecimal.valueOf(20))
                .build();

        entry1 = TimeEntry.builder()
                .id(100L)
                .projectId(PROJECT_ID)
                .taskId(10L)
                .userId(userId)
                .workDate(LocalDate.of(2026, 3, 17))
                .durationMinutes(480) // 8 h
                .build();

        entry2 = TimeEntry.builder()
                .id(101L)
                .projectId(PROJECT_ID)
                .taskId(null)
                .userId(userId)
                .workDate(LocalDate.of(2026, 3, 24))
                .durationMinutes(240) // 4 h
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // getUtilization()
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("getUtilization")
    class GetUtilization {

        @Test
        @DisplayName("returns correct aggregated utilization metrics")
        void getUtilization_WithLoggedHoursAndTasks_ReturnsCorrectMetrics() {
            // 480 + 240 = 720 min = 12 h logged; 40 + 20 = 60 h estimated
            when(projectRepository.findById(PROJECT_ID)).thenReturn(Optional.of(project));
            when(timeEntryRepository.sumDurationMinutesByProjectId(PROJECT_ID)).thenReturn(720L);
            when(taskRepository.findByProjectId(PROJECT_ID)).thenReturn(List.of(completedTask, inProgressTask));

            ProjectUtilizationResponse result = service.getUtilization(PROJECT_ID);

            assertThat(result.getProjectId()).isEqualTo(PROJECT_ID);
            assertThat(result.getTotalLoggedHours()).isEqualTo(12.0);
            assertThat(result.getTotalEstimatedHours()).isEqualTo(60.0);
            assertThat(result.getUtilizationPercentage()).isEqualTo(20.0); // 12/60*100
            assertThat(result.getCompletionPercentage()).isEqualTo(50.0);  // 1/2 tasks
            assertThat(result.getRemainingHours()).isEqualTo(48.0);        // 60-12
            assertThat(result.getHealthStatus()).isEqualTo("GREEN");
            assertThat(result.getTotalTasks()).isEqualTo(2);
            assertThat(result.getCompletedTasks()).isEqualTo(1);
        }

        @Test
        @DisplayName("health is YELLOW when utilization is between 90 and 100 percent")
        void getUtilization_HighUtilization_HealthIsYellow() {
            // 55 h logged / 60 h estimated = 91.67 %
            when(projectRepository.findById(PROJECT_ID)).thenReturn(Optional.of(project));
            when(timeEntryRepository.sumDurationMinutesByProjectId(PROJECT_ID)).thenReturn(3300L); // 55 h
            when(taskRepository.findByProjectId(PROJECT_ID)).thenReturn(List.of(completedTask, inProgressTask));

            ProjectUtilizationResponse result = service.getUtilization(PROJECT_ID);

            assertThat(result.getHealthStatus()).isEqualTo("YELLOW");
        }

        @Test
        @DisplayName("health is RED when utilization exceeds 100 percent")
        void getUtilization_OverUtilized_HealthIsRed() {
            // 70 h logged / 60 h estimated = 116.67 %
            when(projectRepository.findById(PROJECT_ID)).thenReturn(Optional.of(project));
            when(timeEntryRepository.sumDurationMinutesByProjectId(PROJECT_ID)).thenReturn(4200L); // 70 h
            when(taskRepository.findByProjectId(PROJECT_ID)).thenReturn(List.of(completedTask, inProgressTask));

            ProjectUtilizationResponse result = service.getUtilization(PROJECT_ID);

            assertThat(result.getHealthStatus()).isEqualTo("RED");
            assertThat(result.getRemainingHours()).isNegative();
        }

        @Test
        @DisplayName("returns N_A health and null estimates when no tasks have estimated hours")
        void getUtilization_NoEstimatedHours_HealthIsNA() {
            Task noEstTask = Task.builder().id(20L).projectId(PROJECT_ID)
                    .title("No Estimate").status(TaskStatus.TODO).build(); // estimatedHours = null

            when(projectRepository.findById(PROJECT_ID)).thenReturn(Optional.of(project));
            when(timeEntryRepository.sumDurationMinutesByProjectId(PROJECT_ID)).thenReturn(0L);
            when(taskRepository.findByProjectId(PROJECT_ID)).thenReturn(List.of(noEstTask));

            ProjectUtilizationResponse result = service.getUtilization(PROJECT_ID);

            assertThat(result.getHealthStatus()).isEqualTo("N_A");
            assertThat(result.getTotalEstimatedHours()).isNull();
            assertThat(result.getUtilizationPercentage()).isNull();
            assertThat(result.getRemainingHours()).isNull();
        }

        @Test
        @DisplayName("returns zero logged hours and zero completion when no entries and no tasks")
        void getUtilization_NoEntriesNoTasks_ReturnsZeros() {
            when(projectRepository.findById(PROJECT_ID)).thenReturn(Optional.of(project));
            when(timeEntryRepository.sumDurationMinutesByProjectId(PROJECT_ID)).thenReturn(0L);
            when(taskRepository.findByProjectId(PROJECT_ID)).thenReturn(List.of());

            ProjectUtilizationResponse result = service.getUtilization(PROJECT_ID);

            assertThat(result.getTotalLoggedHours()).isEqualTo(0.0);
            assertThat(result.getCompletionPercentage()).isEqualTo(0.0);
            assertThat(result.getTotalTasks()).isEqualTo(0);
        }

        @Test
        @DisplayName("throws ResourceNotFoundException for unknown project")
        void getUtilization_UnknownProject_ThrowsNotFound() {
            when(projectRepository.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.getUtilization(999L))
                    .isInstanceOf(ResourceNotFoundException.class);
        }

        @Test
        @DisplayName("timeElapsedPercentage is null when project has no dates")
        void getUtilization_NoDates_TimeElapsedIsNull() {
            Project noDates = Project.builder().id(PROJECT_ID).name("P").status(ProjectStatus.ACTIVE).build();
            when(projectRepository.findById(PROJECT_ID)).thenReturn(Optional.of(noDates));
            when(timeEntryRepository.sumDurationMinutesByProjectId(PROJECT_ID)).thenReturn(0L);
            when(taskRepository.findByProjectId(PROJECT_ID)).thenReturn(List.of());

            ProjectUtilizationResponse result = service.getUtilization(PROJECT_ID);

            assertThat(result.getTimeElapsedPercentage()).isNull();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // getBreakdown()
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("getBreakdown")
    class GetBreakdown {

        @Test
        @DisplayName("breakdown groups hours correctly by user, task, and week")
        void getBreakdown_WithEntries_GroupsCorrectly() {
            User user = User.builder().id(userId).name("Alice").email("alice@co").build();

            when(projectRepository.existsById(PROJECT_ID)).thenReturn(true);
            when(timeEntryRepository.findAllByProjectId(PROJECT_ID)).thenReturn(List.of(entry1, entry2));
            when(userRepository.findById(userId)).thenReturn(Optional.of(user));
            when(taskRepository.findAllById(List.of(10L))).thenReturn(List.of(completedTask));

            ProjectBreakdownResponse result = service.getBreakdown(PROJECT_ID);

            // User hours: 720 + 240 = 960 min = 16 h
            assertThat(result.getHoursByUser()).hasSize(1);
            assertThat(result.getHoursByUser().getFirst().getUserName()).isEqualTo("Alice");
            assertThat(result.getHoursByUser().getFirst().getHours()).isEqualTo(12.0); // entry1=8h, entry2=4h

            // Task hours: only entry1 has taskId
            assertThat(result.getHoursByTask()).hasSize(1);
            assertThat(result.getHoursByTask().getFirst().getTaskTitle()).isEqualTo("Task A");
            assertThat(result.getHoursByTask().getFirst().getHours()).isEqualTo(8.0);

            // Week breakdown: W12 for Mar 17, W13 for Mar 24
            assertThat(result.getHoursByWeek()).hasSize(2);
        }

        @Test
        @DisplayName("empty breakdown when no time entries exist")
        void getBreakdown_NoEntries_AllListsEmpty() {
            when(projectRepository.existsById(PROJECT_ID)).thenReturn(true);
            when(timeEntryRepository.findAllByProjectId(PROJECT_ID)).thenReturn(List.of());

            ProjectBreakdownResponse result = service.getBreakdown(PROJECT_ID);

            assertThat(result.getHoursByUser()).isEmpty();
            assertThat(result.getHoursByTask()).isEmpty();
            assertThat(result.getHoursByWeek()).isEmpty();
        }

        @Test
        @DisplayName("throws ResourceNotFoundException for unknown project")
        void getBreakdown_UnknownProject_ThrowsNotFound() {
            when(projectRepository.existsById(999L)).thenReturn(false);

            assertThatThrownBy(() -> service.getBreakdown(999L))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }
}
