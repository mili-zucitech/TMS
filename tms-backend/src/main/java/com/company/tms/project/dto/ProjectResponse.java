package com.company.tms.project.dto;

import com.company.tms.project.entity.ProjectStatus;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
public class ProjectResponse {

    private Long id;
    private String projectCode;
    private String name;
    private String description;
    private String clientName;
    private Long departmentId;
    private UUID projectManagerId;
    private LocalDate startDate;
    private LocalDate endDate;
    private ProjectStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
