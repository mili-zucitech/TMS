package com.company.tms.organization.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@Builder
public class OrganizationDepartmentResponse {
    private Long id;
    private String name;
    private String description;
    private List<EmployeeSummaryDTO> employees;
}
