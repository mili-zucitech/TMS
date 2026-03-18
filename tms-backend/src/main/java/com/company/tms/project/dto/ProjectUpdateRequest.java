package com.company.tms.project.dto;

import com.company.tms.project.entity.ProjectStatus;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
public class ProjectUpdateRequest {

    @Size(max = 150, message = "Project name must not exceed 150 characters")
    private String name;

    @Size(max = 1000, message = "Description must not exceed 1000 characters")
    private String description;

    @Size(max = 150, message = "Client name must not exceed 150 characters")
    private String clientName;

    private Long departmentId;

    private UUID projectManagerId;

    private LocalDate startDate;

    private LocalDate endDate;

    private ProjectStatus status;
}
