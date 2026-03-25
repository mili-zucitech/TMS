package com.company.tms.notification.dto;

import com.company.tms.notification.entity.NotificationType;
import com.fasterxml.jackson.annotation.JsonProperty;
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
    // Jackson strips the "is" prefix from boolean getters (isRead() → "read").
    // @JsonProperty forces the JSON key to stay "isRead" so the frontend TypeScript type matches.
    @JsonProperty("isRead")
    private boolean isRead;
    private String referenceId;
    private String referenceType;
    private LocalDateTime createdAt;
}
