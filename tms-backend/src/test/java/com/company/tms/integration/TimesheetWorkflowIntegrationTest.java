package com.company.tms.integration;

import com.company.tms.project.entity.Project;
import com.company.tms.project.entity.ProjectStatus;
import com.company.tms.project.repository.ProjectRepository;
import com.company.tms.timesheet.entity.TimeEntry;
import com.company.tms.timesheet.entity.Timesheet;
import com.company.tms.timesheet.entity.TimesheetStatus;
import com.company.tms.timesheet.repository.TimeEntryRepository;
import com.company.tms.timesheet.repository.TimesheetRepository;
import com.company.tms.user.entity.Role;
import com.company.tms.user.entity.RoleName;
import com.company.tms.user.entity.User;
import com.company.tms.user.entity.UserStatus;
import com.company.tms.user.repository.RoleRepository;
import com.company.tms.user.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration test for the complete timesheet workflow:
 * Employee creates → submits → Manager approves → Admin locks.
 *
 * <p>Uses the H2 in-memory database configured in {@code application-test.yml}.
 * Test data is seeded in {@link #setupTestData()} via direct repository injection.</p>
 */
@SuppressWarnings("null")
@DisplayName("Timesheet Workflow Integration Tests")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class TimesheetWorkflowIntegrationTest extends AbstractIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired UserRepository userRepository;
    @Autowired RoleRepository roleRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired TimesheetRepository timesheetRepository;
    @Autowired TimeEntryRepository timeEntryRepository;
    @Autowired ProjectRepository projectRepository;

    private UUID employeeId;
    private Long draftTimesheetId;      // DRAFT + has entry → used by submit test
    private Long submittedTimesheetId;  // SUBMITTED → used by approve test
    private Long approvedTimesheetId;   // APPROVED  → used by lock test + 403 test

    // ── Helpers ──────────────────────────────────────────────────────────────

    private String getToken(String email, String password) throws Exception {
        String body = """
                {"email": "%s", "password": "%s"}
                """.formatted(email, password);
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .at("/data/accessToken").asText();
    }

    // ── Setup ─────────────────────────────────────────────────────────────────

    @BeforeAll
    void setupTestData() {
        Role employeeRole = roleRepository.findByName(RoleName.EMPLOYEE).orElseThrow();
        Role managerRole  = roleRepository.findByName(RoleName.MANAGER).orElseThrow();

        User manager = userRepository.findByEmail("mgr-ts@tms.com").orElseGet(() ->
                userRepository.save(User.builder()
                        .employeeId("EMP-TS02")
                        .name("TS Manager")
                        .email("mgr-ts@tms.com")
                        .passwordHash(passwordEncoder.encode("Manager@123"))
                        .designation("Engineering Manager")
                        .joiningDate(LocalDate.now())
                        .status(UserStatus.ACTIVE)
                        .role(managerRole)
                        .build()));

        User employee = userRepository.findByEmail("emp-ts@tms.com").orElseGet(() ->
                userRepository.save(User.builder()
                        .employeeId("EMP-TS01")
                        .name("TS Employee")
                        .email("emp-ts@tms.com")
                        .passwordHash(passwordEncoder.encode("Employee@123"))
                        .designation("Developer")
                        .joiningDate(LocalDate.now())
                        .managerId(manager.getId())
                        .status(UserStatus.ACTIVE)
                        .role(employeeRole)
                        .build()));
        employeeId = employee.getId();

        // Ensure at least one project exists for time entries
        Project project = projectRepository.findAll().stream().findFirst().orElseGet(() ->
                projectRepository.save(Project.builder()
                        .projectCode("PROJ-TS01")
                        .name("Integration Test Project")
                        .status(ProjectStatus.ACTIVE)
                        .build()));

        // Timesheet A: DRAFT with a time entry (for submit test)
        Timesheet draftTs = timesheetRepository.save(Timesheet.builder()
                .userId(employeeId)
                .weekStartDate(LocalDate.now().minusDays(14))
                .weekEndDate(LocalDate.now().minusDays(8))
                .status(TimesheetStatus.DRAFT)
                .build());
        draftTimesheetId = draftTs.getId();

        timeEntryRepository.save(TimeEntry.builder()
                .timesheetId(draftTimesheetId)
                .projectId(project.getId())
                .userId(employeeId)
                .workDate(LocalDate.now().minusDays(14))
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(17, 0))
                .durationMinutes(480)
                .description("Integration test work")
                .build());

        // Timesheet B: SUBMITTED (for approve test)
        Timesheet submittedTs = timesheetRepository.save(Timesheet.builder()
                .userId(employeeId)
                .weekStartDate(LocalDate.now().minusDays(21))
                .weekEndDate(LocalDate.now().minusDays(15))
                .status(TimesheetStatus.SUBMITTED)
                .submittedAt(LocalDateTime.now().minusDays(1))
                .build());
        submittedTimesheetId = submittedTs.getId();

        // Timesheet C: APPROVED (for lock test + employee 403 test)
        Timesheet approvedTs = timesheetRepository.save(Timesheet.builder()
                .userId(employeeId)
                .weekStartDate(LocalDate.now().minusDays(28))
                .weekEndDate(LocalDate.now().minusDays(22))
                .status(TimesheetStatus.APPROVED)
                .submittedAt(LocalDateTime.now().minusDays(3))
                .approvedAt(LocalDateTime.now().minusDays(2))
                .approvedBy(manager.getId())
                .build());
        approvedTimesheetId = approvedTs.getId();
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    @Test
    @Order(1)
    @DisplayName("employee creates timesheet successfully")
    void createTimesheet_Employee_Success() throws Exception {
        String token = getToken("emp-ts@tms.com", "Employee@123");

        String body = """
                {
                  "userId": "%s",
                  "weekStartDate": "%s",
                  "weekEndDate": "%s"
                }
                """.formatted(employeeId, LocalDate.now().minusDays(7), LocalDate.now().minusDays(1));

        mockMvc.perform(post("/api/v1/timesheets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + token)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status").value("DRAFT"));
    }

    @Test
    @Order(2)
    @DisplayName("employee submits timesheet with entries")
    void submitTimesheet_WithEntries_Success() throws Exception {
        String token = getToken("emp-ts@tms.com", "Employee@123");

        mockMvc.perform(post("/api/v1/timesheets/{id}/submit", draftTimesheetId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("SUBMITTED"));
    }

    @Test
    @Order(3)
    @DisplayName("manager approves submitted timesheet")
    void approveTimesheet_Manager_Success() throws Exception {
        String token = getToken("mgr-ts@tms.com", "Manager@123");

        mockMvc.perform(post("/api/v1/timesheets/{id}/approve", submittedTimesheetId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + token)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("APPROVED"));
    }

    @Test
    @Order(4)
    @DisplayName("admin locks approved timesheet")
    void lockTimesheet_Admin_Success() throws Exception {
        String token = getToken("admin@tms.com", "Admin@123");

        mockMvc.perform(post("/api/v1/timesheets/{id}/lock", approvedTimesheetId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("LOCKED"));
    }

    @Test
    @Order(5)
    @DisplayName("employee cannot lock timesheet (403 Forbidden)")
    void lockTimesheet_Employee_Returns403() throws Exception {
        String token = getToken("emp-ts@tms.com", "Employee@123");

        // Use the already-locked timesheet — ADMIN role check fires before state check
        mockMvc.perform(post("/api/v1/timesheets/{id}/lock", approvedTimesheetId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }
}

