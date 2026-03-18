package com.company.tms.organization.service;

import com.company.tms.organization.dto.DepartmentResponse;
import com.company.tms.organization.dto.EmployeeSummaryDTO;
import com.company.tms.organization.dto.OrganizationDepartmentResponse;
import com.company.tms.organization.entity.Department;
import com.company.tms.organization.repository.DepartmentRepository;
import com.company.tms.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrganizationService {

    private final DepartmentRepository departmentRepository;

    /** Paged list of departments (used by dropdowns). */
    public Page<DepartmentResponse> getAllDepartments(Pageable pageable) {
        return departmentRepository.findAll(pageable).map(this::toDepartmentResponse);
    }

    /** All departments with their employee lists (organisation chart view). */
    public List<OrganizationDepartmentResponse> getAllDepartmentsWithEmployees() {
        return departmentRepository.findAll()
                .stream()
                .map(this::toOrganizationResponse)
                .collect(Collectors.toList());
    }

    // ── Mappers ───────────────────────────────────────────────────────────────

    private DepartmentResponse toDepartmentResponse(Department dept) {
        return DepartmentResponse.builder()
                .id(dept.getId())
                .name(dept.getName())
                .description(dept.getDescription())
                .headId(dept.getHeadId())
                .status(dept.getStatus())
                .createdAt(dept.getCreatedAt())
                .updatedAt(dept.getUpdatedAt())
                .build();
    }

    private OrganizationDepartmentResponse toOrganizationResponse(Department dept) {
        List<EmployeeSummaryDTO> employees = dept.getEmployees()
                .stream()
                .map(this::toEmployeeSummary)
                .collect(Collectors.toList());
        return OrganizationDepartmentResponse.builder()
                .id(dept.getId())
                .name(dept.getName())
                .description(dept.getDescription())
                .employees(employees)
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
