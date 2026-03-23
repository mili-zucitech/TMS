package com.company.tms.repository;

import com.company.tms.leave.entity.Leave;
import com.company.tms.leave.entity.LeaveStatus;
import com.company.tms.leave.repository.LeaveRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;

@DataJpaTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
@TestPropertySource(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
@DisplayName("LeaveRepository Tests")
class LeaveRepositoryTest {

    @Autowired LeaveRepository leaveRepository;

    private UUID userId1;
    private UUID userId2;
    private Leave pendingLeave;
    private Leave approvedLeave;
    private Leave rejectedLeave;

    @BeforeEach
    void setUp() {
        userId1 = UUID.randomUUID();
        userId2 = UUID.randomUUID();

        pendingLeave = leaveRepository.save(Leave.builder()
                .userId(userId1)
                .leaveTypeId(1L)
                .startDate(LocalDate.of(2026, 5, 5))
                .endDate(LocalDate.of(2026, 5, 7))
                .totalDays(3)
                .reason("Vacation")
                .status(LeaveStatus.PENDING)
                .build());

        approvedLeave = leaveRepository.save(Leave.builder()
                .userId(userId1)
                .leaveTypeId(1L)
                .startDate(LocalDate.of(2026, 6, 1))
                .endDate(LocalDate.of(2026, 6, 5))
                .totalDays(5)
                .reason("Medical")
                .status(LeaveStatus.APPROVED)
                .build());

        rejectedLeave = leaveRepository.save(Leave.builder()
                .userId(userId2)
                .leaveTypeId(2L)
                .startDate(LocalDate.of(2026, 5, 10))
                .endDate(LocalDate.of(2026, 5, 12))
                .totalDays(3)
                .reason("Personal")
                .status(LeaveStatus.REJECTED)
                .build());
    }

    @Test
    @DisplayName("findByUserId returns all leaves for user")
    void findByUserId_ReturnsBothLeaves() {
        List<Leave> result = leaveRepository.findByUserId(userId1);

        assertThat(result).hasSize(2);
        assertThat(result).extracting(Leave::getStatus)
                .containsExactlyInAnyOrder(LeaveStatus.PENDING, LeaveStatus.APPROVED);
    }

    @Test
    @DisplayName("findByUserId returns empty for user with no leaves")
    void findByUserId_NoLeaves_ReturnsEmpty() {
        List<Leave> result = leaveRepository.findByUserId(UUID.randomUUID());

        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("findByUserIdIn returns leaves for multiple users")
    void findByUserIdIn_MultipleUsers_ReturnsAll() {
        List<Leave> result = leaveRepository.findByUserIdIn(List.of(userId1, userId2));

        assertThat(result).hasSize(3);
    }

    @Test
    @DisplayName("findByStatus PENDING returns only pending leaves")
    void findByStatus_Pending_ReturnsPendingOnly() {
        List<Leave> result = leaveRepository.findByStatus(LeaveStatus.PENDING);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getStatus()).isEqualTo(LeaveStatus.PENDING);
    }

    @Test
    @DisplayName("findByStatus APPROVED returns only approved leaves")
    void findByStatus_Approved_ReturnsApprovedOnly() {
        List<Leave> result = leaveRepository.findByStatus(LeaveStatus.APPROVED);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getStatus()).isEqualTo(LeaveStatus.APPROVED);
    }

    @Test
    @DisplayName("findApprovedOverlappingLeaves returns overlapping approved leaves")
    void findApprovedOverlappingLeaves_Overlap_ReturnsResults() {
        // approvedLeave is 06/01 – 06/05; requesting 06/03 – 06/07 overlaps
        List<Leave> result = leaveRepository.findApprovedOverlappingLeaves(
                userId1,
                LocalDate.of(2026, 6, 3),
                LocalDate.of(2026, 6, 7),
                -1L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo(approvedLeave.getId());
    }

    @Test
    @DisplayName("findApprovedOverlappingLeaves returns empty when no overlap")
    void findApprovedOverlappingLeaves_NoOverlap_ReturnsEmpty() {
        // approvedLeave is 06/01 – 06/05; requesting 07/01 – 07/05 does NOT overlap
        List<Leave> result = leaveRepository.findApprovedOverlappingLeaves(
                userId1,
                LocalDate.of(2026, 7, 1),
                LocalDate.of(2026, 7, 5),
                -1L);

        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("findApprovedOverlappingLeaves excludes specified leave ID")
    void findApprovedOverlappingLeaves_ExcludesGivenId() {
        // Same range as approvedLeave but excluding it by ID — should return empty
        List<Leave> result = leaveRepository.findApprovedOverlappingLeaves(
                userId1,
                LocalDate.of(2026, 6, 1),
                LocalDate.of(2026, 6, 5),
                approvedLeave.getId());

        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("existsApprovedLeaveOnDate returns true when user is on leave")
    void existsApprovedLeaveOnDate_OnLeave_ReturnsTrue() {
        // approvedLeave covers 06/01 – 06/05
        boolean result = leaveRepository.existsApprovedLeaveOnDate(
                userId1, LocalDate.of(2026, 6, 3));

        assertThat(result).isTrue();
    }

    @Test
    @DisplayName("existsApprovedLeaveOnDate returns false when user is not on leave")
    void existsApprovedLeaveOnDate_NotOnLeave_ReturnsFalse() {
        boolean result = leaveRepository.existsApprovedLeaveOnDate(
                userId1, LocalDate.of(2026, 7, 1));

        assertThat(result).isFalse();
    }

    @Test
    @DisplayName("existsApprovedLeaveOnDate returns false for PENDING leave on that date")
    void existsApprovedLeaveOnDate_PendingLeave_ReturnsFalse() {
        // pendingLeave covers 05/05 – 05/07 but is PENDING, not APPROVED
        boolean result = leaveRepository.existsApprovedLeaveOnDate(
                userId1, LocalDate.of(2026, 5, 6));

        assertThat(result).isFalse();
    }
}
