package com.company.tms.organization.service;

import com.company.tms.exception.ResourceNotFoundException;
import com.company.tms.exception.ValidationException;
import com.company.tms.organization.dto.*;
import com.company.tms.organization.entity.Department;
import com.company.tms.organization.repository.DepartmentRepository;
import com.company.tms.user.entity.User;
import com.company.tms.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Full CRUD + member management for departments.
 * Accessible by ADMIN and HR_MANAGER roles.
 */
@SuppressWarnings("null")
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DepartmentService {

    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;

    // -------------------------------------------------------------------------
    // Read
    // -------------------------------------------------------------------------

    /** Paged list of departments with member count (no embedded members list). */
    public Page<DepartmentDetailResponse> getAllDepartments(Pageable pageable) {
        return departmentRepository.findAll(pageable)
                .map(dept -> toDetail(dept, false));
    }

    /** Single department with full member list. */
    public DepartmentDetailResponse getDepartmentById(Long id) {
        Department dept = getOrThrow(id);
        return toDetail(dept, true);
    }

    /** Members of a specific department. */
    public List<EmployeeSummaryDTO> getDepartmentMembers(Long id) {
        getOrThrow(id); // ensure dept exists
        return userRepository.findByDepartmentId(id)
                .stream()
                .map(this::toEmployeeSummary)
                .collect(Collectors.toList());
    }

    // -------------------------------------------------------------------------
    // Create / Update / Delete
    // -------------------------------------------------------------------------

    @Transactional
    public DepartmentDetailResponse createDepartment(DepartmentCreateRequest request) {
        String trimmedName = request.getName().trim();

        if (departmentRepository.existsByNameIgnoreCase(trimmedName)) {
            throw new ValidationException("A department with name '" + trimmedName + "' already exists.");
        }

        if (request.getHeadId() != null) {
            validateUserExists(request.getHeadId());
        }

        Department dept = Department.builder()
                .name(trimmedName)
                .description(request.getDescription())
                .headId(request.getHeadId())
                .status("ACTIVE")
                .build();

        Department saved = departmentRepository.save(dept);
        log.info("Department created: id={}, name={}", saved.getId(), saved.getName());
        return toDetail(saved, true);
    }

    @Transactional
    public DepartmentDetailResponse updateDepartment(Long id, DepartmentUpdateRequest request) {
        Department dept = getOrThrow(id);

        if (request.getName() != null) {
            String trimmedName = request.getName().trim();
            if (departmentRepository.existsByNameIgnoreCaseAndIdNot(trimmedName, id)) {
                throw new ValidationException("A department with name '" + trimmedName + "' already exists.");
            }
            dept.setName(trimmedName);
        }

        if (request.getDescription() != null) {
            dept.setDescription(request.getDescription());
        }

        if (request.getHeadId() != null) {
            validateUserExists(request.getHeadId());
            dept.setHeadId(request.getHeadId());
        }

        if (request.getStatus() != null) {
            validateStatus(request.getStatus());
            dept.setStatus(request.getStatus().toUpperCase());
        }

        Department saved = departmentRepository.save(dept);
        log.info("Department updated: id={}", id);
        return toDetail(saved, true);
    }

    @Transactional
    public void deleteDepartment(Long id) {
        Department dept = getOrThrow(id);
        List<User> members = userRepository.findByDepartmentId(id);
        if (!members.isEmpty()) {
            throw new ValidationException(
                    "Cannot delete department '" + dept.getName() + "' — it still has "
                            + members.size() + " member(s). Reassign them first.");
        }
        departmentRepository.delete(dept);
        log.info("Department deleted: id={}", id);
    }

    // -------------------------------------------------------------------------
    // Member management
    // -------------------------------------------------------------------------

    /**
     * Assigns the given users to this department.
     * Any user already in another department will be moved.
     */
    @Transactional
    public DepartmentDetailResponse addMembers(Long departmentId, DepartmentMembersRequest request) {
        getOrThrow(departmentId); // ensure dept exists

        for (UUID userId : request.getUserIds()) {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
            user.setDepartmentId(departmentId);
            userRepository.save(user);
        }

        log.info("Added {} member(s) to department {}", request.getUserIds().size(), departmentId);
        return toDetail(getOrThrow(departmentId), true);
    }

    /**
     * Removes a single user from this department (sets departmentId to null).
     */
    @Transactional
    public void removeMember(Long departmentId, UUID userId) {
        getOrThrow(departmentId); // ensure dept exists
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        if (!departmentId.equals(user.getDepartmentId())) {
            throw new ValidationException("User is not a member of this department.");
        }

        user.setDepartmentId(null);
        userRepository.save(user);
        log.info("Removed user {} from department {}", userId, departmentId);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private Department getOrThrow(Long id) {
        return departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department", "id", id));
    }

    private void validateUserExists(UUID userId) {
        if (!userRepository.existsById(userId)) {
            throw new ResourceNotFoundException("User", "id", userId);
        }
    }

    private void validateStatus(String status) {
        if (!"ACTIVE".equalsIgnoreCase(status) && !"INACTIVE".equalsIgnoreCase(status)) {
            throw new ValidationException("Status must be ACTIVE or INACTIVE.");
        }
    }

    private DepartmentDetailResponse toDetail(Department dept, boolean includeMembers) {
        List<User> members = userRepository.findByDepartmentId(dept.getId());

        String headName = null;
        String headDesignation = null;
        if (dept.getHeadId() != null) {
            User head = userRepository.findById(dept.getHeadId()).orElse(null);
            if (head != null) {
                headName = head.getName();
                headDesignation = head.getDesignation();
            }
        }

        return DepartmentDetailResponse.builder()
                .id(dept.getId())
                .name(dept.getName())
                .description(dept.getDescription())
                .headId(dept.getHeadId())
                .headName(headName)
                .headDesignation(headDesignation)
                .status(dept.getStatus())
                .memberCount(members.size())
                .members(includeMembers
                        ? members.stream().map(this::toEmployeeSummary).collect(Collectors.toList())
                        : null)
                .createdAt(dept.getCreatedAt())
                .updatedAt(dept.getUpdatedAt())
                .build();
    }

    private EmployeeSummaryDTO toEmployeeSummary(User user) {
        return EmployeeSummaryDTO.builder()
                .id(user.getId())
                .employeeId(user.getEmployeeId())
                .name(user.getName())
                .email(user.getEmail())
                .designation(user.getDesignation())
                .status(user.getStatus())
                .build();
    }
}
