package com.company.tms.service;

import com.company.tms.exception.ResourceNotFoundException;
import com.company.tms.exception.ValidationException;
import com.company.tms.user.dto.UserCreateRequest;
import com.company.tms.user.dto.UserResponse;
import com.company.tms.user.dto.UserUpdateRequest;
import com.company.tms.user.entity.*;
import com.company.tms.user.mapper.UserMapper;
import com.company.tms.user.repository.RoleRepository;
import com.company.tms.user.repository.UserRepository;
import com.company.tms.user.service.UserService;
import com.company.tms.user.validator.UserValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("UserService Unit Tests")
class UserServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private RoleRepository roleRepository;
    @Mock private UserMapper userMapper;
    @Mock private UserValidator userValidator;
    @Mock private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserService userService;

    private Role employeeRole;
    private Role adminRole;
    private User testUser;
    private UserResponse testUserResponse;
    private UUID testUserId;

    @BeforeEach
    void setUp() {
        testUserId = UUID.randomUUID();

        employeeRole = new Role();
        employeeRole.setId(1L);
        employeeRole.setName(RoleName.EMPLOYEE);

        adminRole = new Role();
        adminRole.setId(2L);
        adminRole.setName(RoleName.ADMIN);

        testUser = User.builder()
                .id(testUserId)
                .employeeId("EMP-0001")
                .name("John Doe")
                .email("john.doe@company.com")
                .passwordHash("hashed_password")
                .phone("+1234567890")
                .role(employeeRole)
                .status(UserStatus.ACTIVE)
                .designation("Software Engineer")
                .employmentType(EmploymentType.FULL_TIME)
                .joiningDate(LocalDate.of(2023, 1, 15))
                .build();

        testUserResponse = UserResponse.builder()
                .id(testUserId)
                .employeeId("EMP-0001")
                .name("John Doe")
                .email("john.doe@company.com")
                .phone("+1234567890")
                .roleName(RoleName.EMPLOYEE)
                .status(UserStatus.ACTIVE)
                .designation("Software Engineer")
                .employmentType(EmploymentType.FULL_TIME)
                .joiningDate(LocalDate.of(2023, 1, 15))
                .build();
    }

    @Nested
    @DisplayName("CreateUser")
    class CreateUser {

        @Test
        @DisplayName("should create user successfully with auto-generated employee ID")
        void createUser_Success() {
            UserCreateRequest request = new UserCreateRequest();
            request.setName("John Doe");
            request.setEmail("john.doe@company.com");
            request.setPassword("Password@123");
            request.setRoleName(RoleName.EMPLOYEE);

            doNothing().when(userValidator).validateEmailUniqueness(anyString());
            when(roleRepository.findByName(RoleName.EMPLOYEE)).thenReturn(Optional.of(employeeRole));
            when(userMapper.toEntity(request)).thenReturn(testUser);
            when(userRepository.findMaxEmployeeId()).thenReturn(Optional.empty());
            when(passwordEncoder.encode("Password@123")).thenReturn("hashed_password");
            when(userRepository.save(any(User.class))).thenReturn(testUser);
            when(userMapper.toResponse(testUser)).thenReturn(testUserResponse);

            UserResponse result = userService.createUser(request);

            assertThat(result).isNotNull();
            assertThat(result.getName()).isEqualTo("John Doe");
            assertThat(result.getEmployeeId()).isEqualTo("EMP-0001");
            verify(userRepository).save(any(User.class));
        }

        @Test
        @DisplayName("should generate sequential employee ID when previous IDs exist")
        void createUser_GeneratesSequentialEmployeeId() {
            UserCreateRequest request = new UserCreateRequest();
            request.setName("Jane Smith");
            request.setEmail("jane.smith@company.com");
            request.setPassword("Password@123");
            request.setRoleName(RoleName.EMPLOYEE);

            User newUser = User.builder()
                    .id(UUID.randomUUID())
                    .name("Jane Smith")
                    .email("jane.smith@company.com")
                    .role(employeeRole)
                    .status(UserStatus.ACTIVE)
                    .build();

            UserResponse newUserResponse = UserResponse.builder()
                    .id(newUser.getId())
                    .employeeId("EMP-0042")
                    .name("Jane Smith")
                    .email("jane.smith@company.com")
                    .roleName(RoleName.EMPLOYEE)
                    .status(UserStatus.ACTIVE)
                    .build();

            doNothing().when(userValidator).validateEmailUniqueness(anyString());
            when(roleRepository.findByName(RoleName.EMPLOYEE)).thenReturn(Optional.of(employeeRole));
            when(userMapper.toEntity(request)).thenReturn(newUser);
            when(userRepository.findMaxEmployeeId()).thenReturn(Optional.of("EMP-0041"));
            when(passwordEncoder.encode("Password@123")).thenReturn("hashed_password");
            when(userRepository.save(any(User.class))).thenAnswer(inv -> {
                User u = inv.getArgument(0);
                u.setEmployeeId("EMP-0042");
                return u;
            });
            when(userMapper.toResponse(any(User.class))).thenReturn(newUserResponse);

            UserResponse result = userService.createUser(request);

            assertThat(result).isNotNull();
            assertThat(result.getEmployeeId()).isEqualTo("EMP-0042");
        }

        @Test
        @DisplayName("should throw ValidationException when email already exists")
        void createUser_DuplicateEmail_ThrowsValidationException() {
            UserCreateRequest request = new UserCreateRequest();
            request.setName("John Doe");
            request.setEmail("john.doe@company.com");
            request.setPassword("Password@123");
            request.setRoleName(RoleName.EMPLOYEE);

            doThrow(new ValidationException("Email already exists: john.doe@company.com"))
                    .when(userValidator).validateEmailUniqueness("john.doe@company.com");

            assertThatThrownBy(() -> userService.createUser(request))
                    .isInstanceOf(ValidationException.class)
                    .hasMessageContaining("Email already exists");

            verify(userRepository, never()).save(any());
        }

        @Test
        @DisplayName("should throw ResourceNotFoundException when role does not exist")
        void createUser_RoleNotFound_ThrowsResourceNotFoundException() {
            UserCreateRequest request = new UserCreateRequest();
            request.setName("John Doe");
            request.setEmail("john.doe@company.com");
            request.setPassword("Password@123");
            request.setRoleName(RoleName.ADMIN);

            doNothing().when(userValidator).validateEmailUniqueness(anyString());
            when(roleRepository.findByName(RoleName.ADMIN)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> userService.createUser(request))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("Role");

            verify(userRepository, never()).save(any());
        }

        @Test
        @DisplayName("should encode password before saving")
        void createUser_PasswordIsEncoded() {
            UserCreateRequest request = new UserCreateRequest();
            request.setName("John Doe");
            request.setEmail("john.doe@company.com");
            request.setPassword("PlainText@123");
            request.setRoleName(RoleName.EMPLOYEE);

            doNothing().when(userValidator).validateEmailUniqueness(anyString());
            when(roleRepository.findByName(RoleName.EMPLOYEE)).thenReturn(Optional.of(employeeRole));
            when(userMapper.toEntity(request)).thenReturn(testUser);
            when(userRepository.findMaxEmployeeId()).thenReturn(Optional.empty());
            when(passwordEncoder.encode("PlainText@123")).thenReturn("bcrypt_hashed_password");
            when(userRepository.save(any(User.class))).thenReturn(testUser);
            when(userMapper.toResponse(testUser)).thenReturn(testUserResponse);

            userService.createUser(request);

            verify(passwordEncoder).encode("PlainText@123");
            verify(userRepository).save(argThat(u -> "bcrypt_hashed_password".equals(u.getPasswordHash())));
        }
    }

    @Nested
    @DisplayName("GetUserById")
    class GetUserById {

        @Test
        @DisplayName("should return user when ID exists")
        void getUserById_Success() {
            when(userRepository.findById(testUserId)).thenReturn(Optional.of(testUser));
            when(userMapper.toResponse(testUser)).thenReturn(testUserResponse);

            UserResponse result = userService.getUserById(testUserId);

            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo(testUserId);
            assertThat(result.getName()).isEqualTo("John Doe");
        }

        @Test
        @DisplayName("should throw ResourceNotFoundException when user does not exist")
        void getUserById_NotFound_ThrowsException() {
            UUID unknownId = UUID.randomUUID();
            when(userRepository.findById(unknownId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> userService.getUserById(unknownId))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("User")
                    .hasMessageContaining(unknownId.toString());
        }

        @Test
        @DisplayName("should return email for existing user")
        void getUserEmailById_Success() {
            when(userRepository.findById(testUserId)).thenReturn(Optional.of(testUser));

            String email = userService.getUserEmailById(testUserId);

            assertThat(email).isEqualTo("john.doe@company.com");
        }
    }

    @Nested
    @DisplayName("UpdateUser")
    class UpdateUser {

        @Test
        @DisplayName("should update user fields successfully")
        void updateUser_Success() {
            UserUpdateRequest request = new UserUpdateRequest();
            request.setName("John Updated");
            request.setPhone("+9876543210");
            request.setDesignation("Senior Engineer");

            User updatedUser = User.builder()
                    .id(testUserId)
                    .employeeId("EMP-0001")
                    .name("John Updated")
                    .email("john.doe@company.com")
                    .phone("+9876543210")
                    .designation("Senior Engineer")
                    .role(employeeRole)
                    .status(UserStatus.ACTIVE)
                    .build();

            UserResponse updatedResponse = UserResponse.builder()
                    .id(testUserId)
                    .name("John Updated")
                    .phone("+9876543210")
                    .designation("Senior Engineer")
                    .roleName(RoleName.EMPLOYEE)
                    .status(UserStatus.ACTIVE)
                    .build();

            when(userRepository.findById(testUserId)).thenReturn(Optional.of(testUser));
            doNothing().when(userMapper).updateEntity(request, testUser);
            when(userRepository.save(testUser)).thenReturn(updatedUser);
            when(userMapper.toResponse(updatedUser)).thenReturn(updatedResponse);

            UserResponse result = userService.updateUser(testUserId, request);

            assertThat(result).isNotNull();
            assertThat(result.getName()).isEqualTo("John Updated");
            verify(userRepository).save(testUser);
        }

        @Test
        @DisplayName("should update user role when roleName is provided")
        void updateUser_RoleChange_Success() {
            UserUpdateRequest request = new UserUpdateRequest();
            request.setRoleName(RoleName.ADMIN);

            when(userRepository.findById(testUserId)).thenReturn(Optional.of(testUser));
            doNothing().when(userMapper).updateEntity(request, testUser);
            when(roleRepository.findByName(RoleName.ADMIN)).thenReturn(Optional.of(adminRole));
            when(userRepository.save(testUser)).thenReturn(testUser);
            when(userMapper.toResponse(testUser)).thenReturn(testUserResponse);

            userService.updateUser(testUserId, request);

            verify(roleRepository).findByName(RoleName.ADMIN);
            assertThat(testUser.getRole()).isEqualTo(adminRole);
        }

        @Test
        @DisplayName("should throw ResourceNotFoundException when updating non-existent user")
        void updateUser_NotFound_ThrowsException() {
            UUID unknownId = UUID.randomUUID();
            UserUpdateRequest request = new UserUpdateRequest();
            request.setName("Some Name");

            when(userRepository.findById(unknownId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> userService.updateUser(unknownId, request))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("User");
        }
    }

    @Nested
    @DisplayName("DeactivateUser")
    class DeactivateUser {

        @Test
        @DisplayName("should set user status to INACTIVE")
        void deactivateUser_Success() {
            when(userRepository.findById(testUserId)).thenReturn(Optional.of(testUser));
            when(userRepository.save(testUser)).thenReturn(testUser);

            userService.deactivateUser(testUserId);

            assertThat(testUser.getStatus()).isEqualTo(UserStatus.INACTIVE);
            verify(userRepository).save(testUser);
        }

        @Test
        @DisplayName("should throw ResourceNotFoundException for non-existent user")
        void deactivateUser_NotFound_ThrowsException() {
            UUID unknownId = UUID.randomUUID();
            when(userRepository.findById(unknownId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> userService.deactivateUser(unknownId))
                    .isInstanceOf(ResourceNotFoundException.class);

            verify(userRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("GetAllUsers")
    class GetAllUsers {

        @Test
        @DisplayName("should return paginated user list")
        void getAllUsers_ReturnsPaginatedResult() {
            Pageable pageable = PageRequest.of(0, 20);
            Page<User> userPage = new PageImpl<>(List.of(testUser), pageable, 1);

            when(userRepository.findAll(pageable)).thenReturn(userPage);
            when(userMapper.toResponse(testUser)).thenReturn(testUserResponse);

            Page<UserResponse> result = userService.getAllUsers(pageable);

            assertThat(result).isNotNull();
            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getTotalElements()).isEqualTo(1);
        }
    }

    @Nested
    @DisplayName("TeamAndDepartment")
    class TeamAndDepartment {

        @Test
        @DisplayName("should return team members for a manager")
        void getTeamMembers_Success() {
            UUID managerId = UUID.randomUUID();
            when(userRepository.findByManagerId(managerId)).thenReturn(List.of(testUser));
            when(userMapper.toResponse(testUser)).thenReturn(testUserResponse);

            List<UserResponse> result = userService.getTeamMembers(managerId);

            assertThat(result).hasSize(1);
            assertThat(result.get(0)).isEqualTo(testUserResponse);
        }

        @Test
        @DisplayName("should return department members")
        void getDepartmentMembers_Success() {
            Long deptId = 1L;
            when(userRepository.findByDepartmentId(deptId)).thenReturn(List.of(testUser));
            when(userMapper.toResponse(testUser)).thenReturn(testUserResponse);

            List<UserResponse> result = userService.getDepartmentMembers(deptId);

            assertThat(result).hasSize(1);
        }

        @Test
        @DisplayName("isReportingManager returns true when manager is reporting manager")
        void isReportingManager_ReturnsTrue() {
            UUID managerId = UUID.randomUUID();
            UUID employeeId2 = UUID.randomUUID();

            User manager = User.builder().id(managerId).email("manager@company.com").build();
            User subordinate = User.builder().id(employeeId2).managerId(managerId).build();

            when(userRepository.findById(employeeId2)).thenReturn(Optional.of(subordinate));
            when(userRepository.findByEmail("manager@company.com")).thenReturn(Optional.of(manager));

            boolean result = userService.isReportingManager("manager@company.com", employeeId2);

            assertThat(result).isTrue();
        }

        @Test
        @DisplayName("isReportingManager returns false when not reporting manager")
        void isReportingManager_ReturnsFalse() {
            UUID managerId = UUID.randomUUID();
            UUID anotherManagerId = UUID.randomUUID();
            UUID employeeId2 = UUID.randomUUID();

            User manager = User.builder().id(anotherManagerId).email("other@company.com").build();
            User subordinate = User.builder().id(employeeId2).managerId(managerId).build();

            when(userRepository.findById(employeeId2)).thenReturn(Optional.of(subordinate));
            when(userRepository.findByEmail("other@company.com")).thenReturn(Optional.of(manager));

            boolean result = userService.isReportingManager("other@company.com", employeeId2);

            assertThat(result).isFalse();
        }
    }
}
