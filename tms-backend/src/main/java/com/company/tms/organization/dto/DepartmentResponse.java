package com.company.tms.organization.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
public class DepartmentResponse {
    private Long id;
    private String name;
    private String description;
    private UUID headId;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
