package com.company.tms.audit.dto;

import com.company.tms.audit.entity.AuditAction;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class AuditLogResponse {

    private Long id;
    private UUID userId;
    private AuditAction action;
    private String entityType;
    private String entityId;
    private String description;
    private String oldValue;
    private String newValue;
    private String ipAddress;
    private LocalDateTime createdAt;
}
