package com.company.tms.integration;

import com.company.tms.leave.entity.Leave;
import com.company.tms.leave.entity.LeaveBalance;
import com.company.tms.leave.entity.LeaveStatus;
import com.company.tms.leave.entity.LeaveType;
import com.company.tms.leave.repository.LeaveBalanceRepository;
import com.company.tms.leave.repository.LeaveRepository;
import com.company.tms.leave.repository.LeaveTypeRepository;
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
import java.time.Year;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration test for the complete leave request workflow:
 * Employee applies → Manager approves/rejects → Employee cancels.
 *
 * <p>Uses the H2 in-memory database configured in {@code application-test.yml}.
 * Test data (users, leave balances, pre-existing leaves) is seeded in {@link #setupTestData()}.</p>
 */
@DisplayName("Leave Workflow Integration Tests")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class LeaveWorkflowIntegrationTest extends AbstractIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired UserRepository userRepository;
    @Autowired RoleRepository roleRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired LeaveRepository leaveRepository;
    @Autowired LeaveTypeRepository leaveTypeRepository;
    @Autowired LeaveBalanceRepository leaveBalanceRepository;

    private UUID employeeId;
    private Long leaveTypeId;
    private Long pendingLeaveForApprove;  // PENDING → approve test
    private Long pendingLeaveForReject;   // PENDING → reject test
    private Long pendingLeaveForCancel;   // PENDING → cancel test

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

        userRepository.findByEmail("mgr-lv@tms.com").orElseGet(() ->
                userRepository.save(User.builder()
                        .employeeId("EMP-LV02")
                        .name("LV Manager")
                        .email("mgr-lv@tms.com")
                        .passwordHash(passwordEncoder.encode("Manager@123"))
                        .designation("Team Lead")
                        .joiningDate(LocalDate.now())
                        .status(UserStatus.ACTIVE)
                        .role(managerRole)
                        .build()));

        User employee = userRepository.findByEmail("emp-lv@tms.com").orElseGet(() ->
                userRepository.save(User.builder()
                        .employeeId("EMP-LV01")
                        .name("LV Employee")
                        .email("emp-lv@tms.com")
                        .passwordHash(passwordEncoder.encode("Employee@123"))
                        .designation("Analyst")
                        .joiningDate(LocalDate.now())
                        .status(UserStatus.ACTIVE)
                        .role(employeeRole)
                        .build()));
        employeeId = employee.getId();

        // Get or create a leave type (V3 migration seeds "Annual Leave" with ID=1)
        LeaveType leaveType = leaveTypeRepository.findAll().stream().findFirst()
                .orElseGet(() -> leaveTypeRepository.save(LeaveType.builder()
                        .name("Annual Leave - Test")
                        .defaultAnnualAllocation(20)
                        .requiresApproval(true)
                        .build()));
        leaveTypeId = leaveType.getId();

        // Create leave balance for the employee (V3 only seeds for users existing at migration time)
        int currentYear = Year.now().getValue();
        leaveBalanceRepository.findByUserIdAndLeaveTypeIdAndYear(employeeId, leaveTypeId, currentYear)
                .orElseGet(() -> leaveBalanceRepository.save(LeaveBalance.builder()
                        .userId(employeeId)
                        .leaveTypeId(leaveTypeId)
                        .year(currentYear)
                        .totalAllocated(20)
                        .usedLeaves(0)
                        .remainingLeaves(20)
                        .build()));

        // Create 3 pre-existing PENDING leave requests for the approve/reject/cancel tests
        Leave leaveA = leaveRepository.save(Leave.builder()
                .userId(employeeId)
                .leaveTypeId(leaveTypeId)
                .startDate(LocalDate.now().plusDays(10))
                .endDate(LocalDate.now().plusDays(11))
                .totalDays(2)
                .reason("Pre-test leave A (approve)")
                .status(LeaveStatus.PENDING)
                .build());
        pendingLeaveForApprove = leaveA.getId();

        Leave leaveB = leaveRepository.save(Leave.builder()
                .userId(employeeId)
                .leaveTypeId(leaveTypeId)
                .startDate(LocalDate.now().plusDays(20))
                .endDate(LocalDate.now().plusDays(21))
                .totalDays(2)
                .reason("Pre-test leave B (reject)")
                .status(LeaveStatus.PENDING)
                .build());
        pendingLeaveForReject = leaveB.getId();

        Leave leaveC = leaveRepository.save(Leave.builder()
                .userId(employeeId)
                .leaveTypeId(leaveTypeId)
                .startDate(LocalDate.now().plusDays(30))
                .endDate(LocalDate.now().plusDays(31))
                .totalDays(2)
                .reason("Pre-test leave C (cancel)")
                .status(LeaveStatus.PENDING)
                .build());
        pendingLeaveForCancel = leaveC.getId();
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    @Test
    @Order(1)
    @DisplayName("employee submits leave request successfully")
    void createLeaveRequest_Employee_Returns201() throws Exception {
        String token = getToken("emp-lv@tms.com", "Employee@123");

        String body = """
                {
                  "userId": "%s",
                  "leaveTypeId": %d,
                  "startDate": "%s",
                  "endDate": "%s",
                  "reason": "Annual leave — integration test"
                }
                """.formatted(employeeId, leaveTypeId,
                LocalDate.now().plusDays(40), LocalDate.now().plusDays(41));

        mockMvc.perform(post("/api/v1/leaves")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + token)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status").value("PENDING"));
    }

    @Test
    @Order(2)
    @DisplayName("manager approves leave request")
    void approveLeave_Manager_Returns200() throws Exception {
        String token = getToken("mgr-lv@tms.com", "Manager@123");

        mockMvc.perform(post("/api/v1/leaves/{id}/approve", pendingLeaveForApprove)
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + token)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("APPROVED"));
    }

    @Test
    @Order(3)
    @DisplayName("manager rejects leave with reason")
    void rejectLeave_Manager_Returns200() throws Exception {
        String token = getToken("mgr-lv@tms.com", "Manager@123");

        String body = """
                {"rejectionReason": "Critical project deliverable this week"}
                """;

        mockMvc.perform(post("/api/v1/leaves/{id}/reject", pendingLeaveForReject)
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + token)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("REJECTED"));
    }

    @Test
    @Order(4)
    @DisplayName("employee cancels pending leave request")
    void cancelLeave_Employee_Returns200() throws Exception {
        String token = getToken("emp-lv@tms.com", "Employee@123");

        mockMvc.perform(post("/api/v1/leaves/{id}/cancel", pendingLeaveForCancel)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CANCELLED"));
    }

    @Test
    @Order(5)
    @DisplayName("EMPLOYEE cannot approve leave request (403 Forbidden)")
    void approveLeave_Employee_Returns403() throws Exception {
        String token = getToken("emp-lv@tms.com", "Employee@123");

        mockMvc.perform(post("/api/v1/leaves/{id}/approve", pendingLeaveForApprove)
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + token)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }
}

