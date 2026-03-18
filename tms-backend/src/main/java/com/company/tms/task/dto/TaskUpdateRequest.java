package com.company.tms.task.dto;

import com.company.tms.task.entity.TaskPriority;
import com.company.tms.task.entity.TaskStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
public class TaskUpdateRequest {

    @Size(max = 200, message = "Title must not exceed 200 characters")
    private String title;

    @Size(max = 2000, message = "Description must not exceed 2000 characters")
    private String description;

    private UUID assignedUserId;

    private TaskPriority priority;

    private TaskStatus status;

    @DecimalMin(value = "0.01", message = "Estimated hours must be positive")
    private BigDecimal estimatedHours;

    private LocalDate startDate;

    private LocalDate dueDate;
}
