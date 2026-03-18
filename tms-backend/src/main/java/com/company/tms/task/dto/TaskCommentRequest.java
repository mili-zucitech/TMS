package com.company.tms.task.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class TaskCommentRequest {

    @NotNull(message = "Task ID is required")
    private Long taskId;

    @NotNull(message = "User ID is required")
    private UUID userId;

    @NotBlank(message = "Comment text is required")
    @Size(max = 2000, message = "Comment must not exceed 2000 characters")
    private String comment;
}
