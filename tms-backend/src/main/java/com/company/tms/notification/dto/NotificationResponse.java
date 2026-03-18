package com.company.tms.notification.dto;

import com.company.tms.notification.entity.NotificationType;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class NotificationResponse {

    private Long id;
    private UUID userId;
    private String title;
    private String message;
    private NotificationType type;
    private boolean isRead;
    private String referenceId;
    private String referenceType;
    private LocalDateTime createdAt;
}
