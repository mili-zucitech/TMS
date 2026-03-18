package com.company.tms.task.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
public class TaskCommentResponse {

    private Long id;
    private Long taskId;
    private UUID userId;
    private String comment;
    private LocalDateTime createdAt;
}
