package com.company.tms.project.dto;

import com.company.tms.project.entity.ProjectRole;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
public class ProjectAssignmentRequest {

    @NotNull(message = "Project ID is required")
    private Long projectId;

    @NotNull(message = "User ID is required")
    private UUID userId;

    private ProjectRole role;

    @DecimalMin(value = "1.0", message = "Allocation percentage must be at least 1%")
    @DecimalMax(value = "100.0", message = "Allocation percentage must not exceed 100%")
    private BigDecimal allocationPercentage;

    private LocalDate startDate;

    private LocalDate endDate;
}
