package com.company.tms.project.dto;

import com.company.tms.project.entity.ProjectRole;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
public class ProjectAssignmentResponse {

    private Long id;
    private Long projectId;
    private UUID userId;
    private ProjectRole role;
    private BigDecimal allocationPercentage;
    private LocalDate startDate;
    private LocalDate endDate;
    private LocalDateTime createdAt;
}
