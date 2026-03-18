package com.company.tms.notification.controller;

import com.company.tms.notification.dto.NotificationResponse;
import com.company.tms.notification.service.NotificationService;
import com.company.tms.notification.service.ReminderService;
import com.company.tms.util.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final ReminderService reminderService;

    /**
     * Returns all notifications for a user.
     * ADMIN can request any userId; regular users can only request their own.
     */
    @GetMapping("/user/{userId}")
    @PreAuthorize("hasRole('ADMIN') or #userId.toString() == authentication.name"
            + " or @userAccessHelper.isSelf(#userId)")
    public ResponseEntity<ApiResponse<List<NotificationResponse>>> getUserNotifications(
            @PathVariable UUID userId) {
        List<NotificationResponse> notifications = notificationService.getUserNotifications(userId);
        return ResponseEntity.ok(ApiResponse.success(notifications));
    }

    /**
     * Returns the count of unread notifications for a user.
     */
    @GetMapping("/user/{userId}/unread-count")
    @PreAuthorize("hasRole('ADMIN') or @userAccessHelper.isSelf(#userId)")
    public ResponseEntity<ApiResponse<Long>> getUnreadCount(
            @PathVariable UUID userId) {
        long count = notificationService.getUnreadCount(userId);
        return ResponseEntity.ok(ApiResponse.success(count));
    }

    /**
     * Marks a single notification as read.
     * Security enforced at service layer via ownership check.
     */
    @PutMapping("/{id}/read")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<NotificationResponse>> markAsRead(
            @PathVariable Long id) {
        NotificationResponse updated = notificationService.markNotificationAsRead(id);
        return ResponseEntity.ok(ApiResponse.success(updated));
    }

    /**
     * Sends a timesheet-submission reminder to the given employee.
     * MANAGER or ADMIN only.
     */
    @PostMapping("/remind/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR', 'HR_MANAGER', 'MANAGER', 'DIRECTOR')")
    public ResponseEntity<ApiResponse<String>> sendTimesheetReminder(
            @PathVariable UUID userId) {
        log.debug("POST /api/v1/notifications/remind/{}", userId);
        reminderService.sendTimesheetReminder(userId);
        return ResponseEntity.ok(ApiResponse.success("Reminder sent"));
    }
}
