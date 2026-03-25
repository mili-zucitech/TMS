package com.company.tms.service;

import com.company.tms.project.repository.ProjectRepository;
import com.company.tms.report.dto.BillableHoursReport;
import com.company.tms.report.dto.EmployeeHoursReport;
import com.company.tms.report.dto.ProjectUtilizationReport;
import com.company.tms.report.service.ReportService;
import com.company.tms.timesheet.entity.TimeEntry;
import com.company.tms.timesheet.entity.Timesheet;
import com.company.tms.timesheet.entity.TimesheetStatus;
import com.company.tms.timesheet.repository.TimeEntryRepository;
import com.company.tms.timesheet.repository.TimesheetRepository;
import com.company.tms.user.entity.Role;
import com.company.tms.user.entity.RoleName;
import com.company.tms.user.entity.User;
import com.company.tms.user.entity.UserStatus;
import com.company.tms.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("ReportService Tests")
class ReportServiceTest {

    @Mock TimesheetRepository timesheetRepository;
    @Mock TimeEntryRepository timeEntryRepository;
    @Mock UserRepository userRepository;
    @Mock ProjectRepository projectRepository;
    @InjectMocks ReportService reportService;

    private UUID adminUserId;
    private UUID employeeUserId;
    private User adminUser;
    private User employeeUser;
    private Authentication adminAuth;
    private Authentication employeeAuth;
    private Timesheet sampleTimesheet;
    private TimeEntry sampleTimeEntry;

    @BeforeEach
    void setUp() {
        adminUserId    = UUID.randomUUID();
        employeeUserId = UUID.randomUUID();

        Role adminRole    = Role.builder().name(RoleName.ADMIN).build();
        Role employeeRole = Role.builder().name(RoleName.EMPLOYEE).build();

        adminUser = User.builder()
                .id(adminUserId)
                .name("Admin User")
                .email("admin@tms.com")
                .employeeId("EMP-0001")
                .status(UserStatus.ACTIVE)
                .role(adminRole)
                .build();

        employeeUser = User.builder()
                .id(employeeUserId)
                .name("Test Employee")
                .email("emp@tms.com")
                .employeeId("EMP-0002")
                .status(UserStatus.ACTIVE)
                .role(employeeRole)
                .build();

        // Mock admin authentication
        adminAuth = mock(Authentication.class);
        when(adminAuth.getName()).thenReturn("admin@tms.com");
        doReturn(List.of(new SimpleGrantedAuthority("ROLE_ADMIN")))
                .when(adminAuth).getAuthorities();

        // Mock employee authentication
        employeeAuth = mock(Authentication.class);
        when(employeeAuth.getName()).thenReturn("emp@tms.com");
        doReturn(List.of(new SimpleGrantedAuthority("ROLE_EMPLOYEE")))
                .when(employeeAuth).getAuthorities();

        sampleTimesheet = Timesheet.builder()
                .id(1L)
                .userId(employeeUserId)
                .weekStartDate(LocalDate.now().minusDays(7))
                .weekEndDate(LocalDate.now().minusDays(1))
                .status(TimesheetStatus.APPROVED)
                .build();

        sampleTimeEntry = TimeEntry.builder()
                .id(1L)
                .timesheetId(1L)
                .projectId(10L)
                .userId(employeeUserId)
                .workDate(LocalDate.now().minusDays(7))
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(17, 0))
                .durationMinutes(480)
                .build();
    }

    @Nested
    @DisplayName("getEmployeeHoursReport")
    class GetEmployeeHoursReport {

        @Test
        @DisplayName("admin sees hours for all users")
        void getEmployeeHoursReport_Admin_SeesAllUsers() {
            when(userRepository.findAll()).thenReturn(List.of(adminUser, employeeUser));
            when(timesheetRepository.findByUserId(employeeUserId)).thenReturn(List.of(sampleTimesheet));
            when(timesheetRepository.findByUserId(adminUserId)).thenReturn(List.of());
            when(timeEntryRepository.findByTimesheetId(1L)).thenReturn(List.of(sampleTimeEntry));
            when(projectRepository.findAll()).thenReturn(List.of());

            EmployeeHoursReport report = reportService.getEmployeeHoursReport(
                    adminAuth, null, null, null, null);

            assertThat(report).isNotNull();
            assertThat(report.getEntries()).isNotEmpty();
            assertThat(report.getTotalHours()).isGreaterThan(0);
        }

        @Test
        @DisplayName("employee sees only their own hours")
        void getEmployeeHoursReport_Employee_SeesSelfOnly() {
            when(userRepository.findByEmail("emp@tms.com")).thenReturn(Optional.of(employeeUser));
            when(userRepository.findAll()).thenReturn(List.of(employeeUser));
            when(timesheetRepository.findByUserId(employeeUserId)).thenReturn(List.of(sampleTimesheet));
            when(timeEntryRepository.findByTimesheetId(1L)).thenReturn(List.of(sampleTimeEntry));
            when(projectRepository.findAll()).thenReturn(List.of());

            EmployeeHoursReport report = reportService.getEmployeeHoursReport(
                    employeeAuth, null, null, null, null);

            assertThat(report).isNotNull();
            assertThat(report.getEntries()).hasSize(1);
            assertThat(report.getEntries().get(0).getUserId()).isEqualTo(employeeUserId);
        }

        @Test
        @DisplayName("returns empty report for null authentication")
        void getEmployeeHoursReport_NullAuth_ReturnsEmpty() {
            EmployeeHoursReport report = reportService.getEmployeeHoursReport(
                    null, null, null, null, null);

            assertThat(report).isNotNull();
            assertThat(report.getEntries()).isEmpty();
        }

        @Test
        @DisplayName("date filter restricts timesheets to the specified window")
        void getEmployeeHoursReport_WithDateFilter_RestrictsToWindow() {
            when(userRepository.findAll()).thenReturn(List.of(employeeUser));
            LocalDate futureStart = LocalDate.now().plusMonths(1);
            when(timesheetRepository.findByUserId(employeeUserId)).thenReturn(List.of(sampleTimesheet));
            when(projectRepository.findAll()).thenReturn(List.of());

            // sampleTimesheet weekStart is in the past — filter to future should yield empty
            EmployeeHoursReport report = reportService.getEmployeeHoursReport(
                    adminAuth, futureStart, null, null, null);

            assertThat(report.getEntries()).isEmpty();
        }
    }

    @Nested
    @DisplayName("getProjectUtilizationReport")
    class GetProjectUtilizationReport {

        @Test
        @DisplayName("aggregates hours per project for admin")
        void getProjectUtilizationReport_Admin_AggregatesAllProjects() {
            when(userRepository.findAll()).thenReturn(List.of(employeeUser));
            when(projectRepository.findAll()).thenReturn(List.of());
            when(timesheetRepository.findByUserId(employeeUserId)).thenReturn(List.of(sampleTimesheet));
            when(timeEntryRepository.findByTimesheetId(1L)).thenReturn(List.of(sampleTimeEntry));

            ProjectUtilizationReport report = reportService.getProjectUtilizationReport(
                    adminAuth, null, null, null);

            assertThat(report).isNotNull();
            assertThat(report.getEntries()).hasSize(1);
            assertThat(report.getTotalLoggedHours()).isGreaterThan(0);
        }

        @Test
        @DisplayName("returns empty report when no timesheets exist")
        void getProjectUtilizationReport_NoTimesheets_ReturnsEmpty() {
            when(userRepository.findAll()).thenReturn(List.of(employeeUser));
            when(projectRepository.findAll()).thenReturn(List.of());
            when(timesheetRepository.findByUserId(employeeUserId)).thenReturn(List.of());

            ProjectUtilizationReport report = reportService.getProjectUtilizationReport(
                    adminAuth, null, null, null);

            assertThat(report.getEntries()).isEmpty();
            assertThat(report.getTotalLoggedHours()).isEqualTo(0.0);
        }
    }

    @Nested
    @DisplayName("getBillableHoursReport")
    class GetBillableHoursReport {

        @Test
        @DisplayName("computes billable hours per employee per project")
        void getBillableHoursReport_Admin_ComputesCorrectly() {
            when(userRepository.findAll()).thenReturn(List.of(employeeUser));
            when(projectRepository.findAll()).thenReturn(List.of());
            when(timesheetRepository.findByUserId(employeeUserId)).thenReturn(List.of(sampleTimesheet));
            when(timeEntryRepository.findByTimesheetId(1L)).thenReturn(List.of(sampleTimeEntry));

            BillableHoursReport report = reportService.getBillableHoursReport(
                    adminAuth, null, null, null, null);

            assertThat(report).isNotNull();
            assertThat(report.getEntries()).isNotEmpty();
        }
    }
}
