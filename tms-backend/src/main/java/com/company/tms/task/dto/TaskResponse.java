package com.company.tms.task.dto;

import com.company.tms.task.entity.TaskPriority;
import com.company.tms.task.entity.TaskStatus;
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
public class TaskResponse {

    private Long id;
    private String taskCode;
    private String title;
    private String description;
    private Long projectId;
    private UUID assignedUserId;
    private UUID createdByUserId;
    private TaskPriority priority;
    private TaskStatus status;
    private BigDecimal estimatedHours;
    private LocalDate startDate;
    private LocalDate dueDate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
