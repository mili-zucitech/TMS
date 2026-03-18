package com.company.tms.organization.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@Builder
public class DepartmentDetailResponse {

    private Long id;
    private String name;
    private String description;
    private UUID headId;
    private String headName;
    private String headDesignation;
    private String status;
    private int memberCount;
    private List<EmployeeSummaryDTO> members;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
