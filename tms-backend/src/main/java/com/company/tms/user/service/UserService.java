package com.company.tms.user.service;

import com.company.tms.exception.ResourceNotFoundException;
import com.company.tms.user.dto.UserCreateRequest;
import com.company.tms.user.dto.UserResponse;
import com.company.tms.user.dto.UserUpdateRequest;
import com.company.tms.user.entity.Role;
import com.company.tms.user.entity.RoleName;
import com.company.tms.user.entity.User;
import com.company.tms.user.entity.UserStatus;
import com.company.tms.user.mapper.UserMapper;
import com.company.tms.user.repository.RoleRepository;
import com.company.tms.user.repository.UserRepository;
import com.company.tms.user.validator.UserValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserMapper userMapper;
    private final UserValidator userValidator;
    private final PasswordEncoder passwordEncoder;

    /**
     * Creates a new user after validating email and employee ID uniqueness.
     * The provided plain-text password is hashed before persistence.
     */
    @Transactional
    public synchronized UserResponse createUser(UserCreateRequest request) {
        log.info("Creating user for email: {}", request.getEmail());

        userValidator.validateEmailUniqueness(request.getEmail());

        Role role = resolveRole(request.getRoleName());

        User user = userMapper.toEntity(request);
        user.setEmployeeId(generateNextEmployeeId());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setRole(role);
        user.setStatus(UserStatus.ACTIVE);

        User saved = userRepository.save(user);
        log.info("User created successfully with id: {} and employeeId: {}", saved.getId(), saved.getEmployeeId());
        return userMapper.toResponse(saved);
    }

    /**
     * Updates mutable fields of an existing user. The employeeId and email
     * are immutable; role changes are applied when a new roleName is provided.
     */
    @Transactional
    public UserResponse updateUser(UUID id, UserUpdateRequest request) {
        log.info("Updating user with id: {}", id);

        User user = getExistingUser(id);

        userMapper.updateEntity(request, user);

        if (request.getRoleName() != null) {
            user.setRole(resolveRole(request.getRoleName()));
        }
        if (request.getStatus() != null) {
            user.setStatus(request.getStatus());
        }
        if (request.getName() != null) {
            user.setName(request.getName());
        }
        if (request.getPhone() != null) {
            user.setPhone(request.getPhone());
        }
        if (request.getDepartmentId() != null) {
            user.setDepartmentId(request.getDepartmentId());
        }
        if (request.getManagerId() != null) {
            user.setManagerId(request.getManagerId());
        }
        if (request.getDesignation() != null) {
            user.setDesignation(request.getDesignation());
        }
        if (request.getEmploymentType() != null) {
            user.setEmploymentType(request.getEmploymentType());
        }
        if (request.getJoiningDate() != null) {
            user.setJoiningDate(request.getJoiningDate());
        }

        User saved = userRepository.save(user);
        log.info("User updated successfully with id: {}", saved.getId());
        return userMapper.toResponse(saved);
    }

    /**
     * Retrieves a user by their UUID.
     */
    public UserResponse getUserById(UUID id) {
        log.debug("Fetching user by id: {}", id);
        return userMapper.toResponse(getExistingUser(id));
    }

    /**
     * Retrieves the email of a user by their UUID; used for security SpEL expressions in the controller.
     */
    public String getUserEmailById(UUID id) {
        return getExistingUser(id).getEmail();
    }

    /**
     * Returns a paginated list of all users.
     */
    public Page<UserResponse> getAllUsers(Pageable pageable) {
        log.debug("Fetching all users, page: {}, size: {}", pageable.getPageNumber(), pageable.getPageSize());
        return userRepository.findAll(pageable).map(userMapper::toResponse);
    }

    /**
     * Deactivates a user by setting their status to INACTIVE.
     * The user record is retained for audit purposes.
     */
    @Transactional
    public void deactivateUser(UUID id) {
        log.info("Deactivating user with id: {}", id);
        User user = getExistingUser(id);
        user.setStatus(UserStatus.INACTIVE);
        userRepository.save(user);
        log.info("User deactivated successfully with id: {}", id);
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Returns all users in the given department.
     * Used by the "My Team" module for HR and Employee roles.
     */
    public List<UserResponse> getDepartmentMembers(Long departmentId) {
        log.debug("Fetching department members for department id: {}", departmentId);
        return userRepository.findByDepartmentId(departmentId)
                .stream()
                .map(userMapper::toResponse)
                .toList();
    }

    /**
     * Returns all users whose managerId matches the given manager UUID.
     * Used by the "My Team" module for managers to view their direct reports.
     */
    public List<UserResponse> getTeamMembers(UUID managerId) {
        log.debug("Fetching team members for manager id: {}", managerId);
        return userRepository.findByManagerId(managerId)
                .stream()
                .map(userMapper::toResponse)
                .toList();
    }

    /**
     * Returns true if the user identified by {@code managerEmail} is the
     * reporting manager (User.managerId) of the user identified by {@code subordinateId}.
     * Used in @PreAuthorize expressions on timesheet endpoints.
     */
    public boolean isReportingManager(String managerEmail, UUID subordinateId) {
        try {
            User subordinate = getExistingUser(subordinateId);
            return userRepository.findByEmail(managerEmail)
                    .map(manager -> manager.getId().equals(subordinate.getManagerId()))
                    .orElse(false);
        } catch (Exception e) {
            return false;
        }
    }

    private User getExistingUser(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
    }

    private Role resolveRole(RoleName roleName) {
        return roleRepository.findByName(roleName)
                .orElseThrow(() -> new ResourceNotFoundException("Role", "name", roleName));
    }

    /**
     * Generates the next sequential employee ID in the format EMP-XXXX.
     * Synchronized to prevent duplicate IDs under concurrent creation requests.
     */
    private String generateNextEmployeeId() {
        Optional<String> maxId = userRepository.findMaxEmployeeId();
        if (maxId.isEmpty()) {
            return "EMP-0001";
        }
        String max = maxId.get();
        try {
            int seq = Integer.parseInt(max.substring(4)); // parse digits after "EMP-"
            return String.format("EMP-%04d", seq + 1);
        } catch (NumberFormatException e) {
            log.warn("Could not parse employeeId '{}', falling back to count-based generation", max);
            long count = userRepository.count();
            return String.format("EMP-%04d", count + 1);
        }
    }
}

