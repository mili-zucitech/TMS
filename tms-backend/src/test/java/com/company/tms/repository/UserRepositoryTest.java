package com.company.tms.repository;

import com.company.tms.user.entity.*;
import com.company.tms.user.repository.RoleRepository;
import com.company.tms.user.repository.UserRepository;
import com.company.tms.organization.entity.Department;
import com.company.tms.organization.repository.DepartmentRepository;
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
@DisplayName("UserRepository Tests")
class UserRepositoryTest {

    @Autowired UserRepository userRepository;
    @Autowired RoleRepository roleRepository;
    @Autowired DepartmentRepository departmentRepository;

    private Role employeeRole;
    private User user1;
    private User user2;
    private UUID manager1Id;
    private Long departmentId;

    @BeforeEach
    void setUp() {
        // Persist roles
        employeeRole = roleRepository.save(Role.builder().name(RoleName.EMPLOYEE).build());
        roleRepository.save(Role.builder().name(RoleName.ADMIN).build());

        Department dept = departmentRepository.save(Department.builder().name("Engineering").build());
        departmentId = dept.getId();

        manager1Id = UUID.randomUUID();

        user1 = userRepository.save(User.builder()
                .employeeId("EMP-0001")
                .name("Alice Smith")
                .email("alice@company.com")
                .passwordHash("hashed1")
                .role(employeeRole)
                .departmentId(departmentId)
                .managerId(manager1Id)
                .status(UserStatus.ACTIVE)
                .designation("Developer")
                .employmentType(EmploymentType.FULL_TIME)
                .joiningDate(LocalDate.of(2023, 1, 1))
                .build());

        user2 = userRepository.save(User.builder()
                .employeeId("EMP-0002")
                .name("Bob Jones")
                .email("bob@company.com")
                .passwordHash("hashed2")
                .role(employeeRole)
                .departmentId(departmentId)
                .status(UserStatus.INACTIVE)
                .designation("Tester")
                .employmentType(EmploymentType.PART_TIME)
                .joiningDate(LocalDate.of(2022, 6, 1))
                .build());
    }

    @Test
    @DisplayName("findByEmail returns user when email exists")
    void findByEmail_Exists_ReturnsUser() {
        Optional<User> result = userRepository.findByEmail("alice@company.com");

        assertThat(result).isPresent();
        assertThat(result.get().getName()).isEqualTo("Alice Smith");
    }

    @Test
    @DisplayName("findByEmail returns empty when email does not exist")
    void findByEmail_NotExists_ReturnsEmpty() {
        Optional<User> result = userRepository.findByEmail("nonexistent@company.com");

        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("findByEmployeeId returns user when employeeId exists")
    void findByEmployeeId_Exists_ReturnsUser() {
        Optional<User> result = userRepository.findByEmployeeId("EMP-0001");

        assertThat(result).isPresent();
        assertThat(result.get().getEmail()).isEqualTo("alice@company.com");
    }

    @Test
    @DisplayName("findByEmployeeId returns empty for unknown ID")
    void findByEmployeeId_NotExists_ReturnsEmpty() {
        Optional<User> result = userRepository.findByEmployeeId("EMP-9999");

        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("existsByEmail returns true when email exists")
    void existsByEmail_Exists_ReturnsTrue() {
        boolean exists = userRepository.existsByEmail("alice@company.com");

        assertThat(exists).isTrue();
    }

    @Test
    @DisplayName("existsByEmail returns false when email does not exist")
    void existsByEmail_NotExists_ReturnsFalse() {
        boolean exists = userRepository.existsByEmail("unknown@company.com");

        assertThat(exists).isFalse();
    }

    @Test
    @DisplayName("existsByEmailAndIdNot returns true for clash with another user")
    void existsByEmailAndIdNot_DuplicateEmail_ReturnsTrue() {
        boolean exists = userRepository.existsByEmailAndIdNot("alice@company.com", user2.getId());

        assertThat(exists).isTrue();
    }

    @Test
    @DisplayName("existsByEmailAndIdNot returns false for own email")
    void existsByEmailAndIdNot_OwnEmail_ReturnsFalse() {
        boolean exists = userRepository.existsByEmailAndIdNot("alice@company.com", user1.getId());

        assertThat(exists).isFalse();
    }

    @Test
    @DisplayName("findByManagerId returns direct reports")
    void findByManagerId_ReturnsDirectReports() {
        List<User> reports = userRepository.findByManagerId(manager1Id);

        assertThat(reports).hasSize(1);
        assertThat(reports.get(0).getName()).isEqualTo("Alice Smith");
    }

    @Test
    @DisplayName("findByManagerId returns empty when no direct reports")
    void findByManagerId_NoReports_ReturnsEmpty() {
        List<User> reports = userRepository.findByManagerId(UUID.randomUUID());

        assertThat(reports).isEmpty();
    }

    @Test
    @DisplayName("findByDepartmentId returns users in department")
    void findByDepartmentId_ReturnsDepartmentMembers() {
        List<User> members = userRepository.findByDepartmentId(departmentId);

        assertThat(members).hasSizeGreaterThanOrEqualTo(2);
        assertThat(members).extracting(User::getEmail)
                .containsExactlyInAnyOrder("alice@company.com", "bob@company.com");
    }

    @Test
    @DisplayName("findByStatus returns only active users")
    void findByStatus_Active_ReturnsActiveUsers() {
        List<User> activeUsers = userRepository.findByStatus(UserStatus.ACTIVE);

        assertThat(activeUsers).hasSize(1);
        assertThat(activeUsers.get(0).getName()).isEqualTo("Alice Smith");
    }

    @Test
    @DisplayName("findMaxEmployeeId returns EMP-0002 when two users exist")
    void findMaxEmployeeId_TwoUsers_ReturnsMax() {
        Optional<String> maxId = userRepository.findMaxEmployeeId();

        assertThat(maxId).isPresent();
        assertThat(maxId.get()).isEqualTo("EMP-0002");
    }
}
