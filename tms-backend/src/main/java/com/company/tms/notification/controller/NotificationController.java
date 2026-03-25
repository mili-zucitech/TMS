package com.company.tms.notification.controller;

import com.company.tms.notification.dto.NotificationResponse;
import com.company.tms.notification.service.NotificationService;
import com.company.tms.notification.service.ReminderService;
import com.company.tms.util.ApiResponse;
import jakarta.validation.constraints.NotEmpty;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Slf4j
@Validated
@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final ReminderService reminderService;

    // -------------------------------------------------------------------------
    // Read
    // -------------------------------------------------------------------------

    @GetMapping("/user/{userId}")
    @PreAuthorize("hasRole('ADMIN') or #userId.toString() == authentication.name"
            + " or @userAccessHelper.isSelf(#userId)")
    public ResponseEntity<ApiResponse<List<NotificationResponse>>> getUserNotifications(
            @PathVariable UUID userId) {
        return ResponseEntity.ok(ApiResponse.success(
                notificationService.getUserNotifications(userId)));
    }

    @GetMapping("/user/{userId}/unread-count")
    @PreAuthorize("hasRole('ADMIN') or @userAccessHelper.isSelf(#userId)")
    public ResponseEntity<ApiResponse<Long>> getUnreadCount(@PathVariable UUID userId) {
        return ResponseEntity.ok(ApiResponse.success(
                notificationService.getUnreadCount(userId)));
    }

    // -------------------------------------------------------------------------
    // Update — mark read
    // -------------------------------------------------------------------------

    @PutMapping("/{id}/read")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<NotificationResponse>> markAsRead(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
                notificationService.markNotificationAsRead(id)));
    }

    /**
     * Marks ALL notifications for a user as read in a single efficient DB update.
     */
    @PutMapping("/user/{userId}/read-all")
    @PreAuthorize("hasRole('ADMIN') or @userAccessHelper.isSelf(#userId)")
    public ResponseEntity<ApiResponse<String>> markAllAsRead(@PathVariable UUID userId) {
        notificationService.markAllNotificationsAsRead(userId);
        return ResponseEntity.ok(ApiResponse.success("All notifications marked as read"));
    }

    // -------------------------------------------------------------------------
    // Delete
    // -------------------------------------------------------------------------

    /**
     * Deletes a single notification owned by the currently authenticated user.
     * Returns 403 if the notification belongs to a different user.
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> deleteNotification(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails currentUser) {
        notificationService.deleteNotification(id, currentUser.getUsername());
        return ResponseEntity.noContent().build();
    }

    /** Deletes ALL notifications for a user. */
    @DeleteMapping("/user/{userId}/all")
    @PreAuthorize("hasRole('ADMIN') or @userAccessHelper.isSelf(#userId)")
    public ResponseEntity<Void> deleteAllNotifications(@PathVariable UUID userId) {
        notificationService.deleteAllNotifications(userId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Deletes the given notification IDs that belong to the user.
     * IDs belonging to a different user are skipped silently (no partial error).
     */
    @DeleteMapping("/user/{userId}/batch")
    @PreAuthorize("hasRole('ADMIN') or @userAccessHelper.isSelf(#userId)")
    public ResponseEntity<Void> deleteSelectedNotifications(
            @PathVariable UUID userId,
            @RequestBody @NotEmpty List<Long> ids) {
        notificationService.deleteSelectedNotifications(ids, userId);
        return ResponseEntity.noContent().build();
    }

    // -------------------------------------------------------------------------
    // Reminders
    // -------------------------------------------------------------------------

    @PostMapping("/remind/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR', 'HR_MANAGER', 'MANAGER', 'DIRECTOR')")
    public ResponseEntity<ApiResponse<String>> sendTimesheetReminder(@PathVariable UUID userId) {
        log.debug("POST /api/v1/notifications/remind/{}", userId);
        reminderService.sendTimesheetReminder(userId);
        return ResponseEntity.ok(ApiResponse.success("Reminder sent"));
    }
}
