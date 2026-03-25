package com.company.tms.notification.service;

import com.company.tms.exception.ResourceNotFoundException;
import com.company.tms.notification.dto.NotificationCreateRequest;
import com.company.tms.notification.dto.NotificationResponse;
import com.company.tms.notification.entity.Notification;
import com.company.tms.notification.mapper.NotificationMapper;
import com.company.tms.notification.repository.NotificationRepository;
import com.company.tms.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final NotificationMapper notificationMapper;
    private final UserRepository userRepository;

    // -------------------------------------------------------------------------
    // Create
    // -------------------------------------------------------------------------

    @Transactional
    public NotificationResponse createNotification(NotificationCreateRequest request) {
        log.debug("Creating notification for user {}: {}", request.getUserId(), request.getTitle());
        Notification notification = Notification.builder()
                .userId(request.getUserId())
                .title(request.getTitle())
                .message(request.getMessage())
                .type(request.getType())
                .referenceId(request.getReferenceId())
                .referenceType(request.getReferenceType())
                .build();
        return notificationMapper.toNotificationResponse(
                notificationRepository.save(notification));
    }

    // -------------------------------------------------------------------------
    // Read
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<NotificationResponse> getUserNotifications(UUID userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(notificationMapper::toNotificationResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(UUID userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    // -------------------------------------------------------------------------
    // Update — mark read
    // -------------------------------------------------------------------------

    @Transactional
    public NotificationResponse markNotificationAsRead(Long notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Notification not found with id: " + notificationId));
        notification.setRead(true);
        return notificationMapper.toNotificationResponse(
                notificationRepository.save(notification));
    }

    /**
     * Marks all unread notifications for a user as read in a single DB update.
     * More efficient than calling {@link #markNotificationAsRead} per item.
     */
    @Transactional
    public void markAllNotificationsAsRead(UUID userId) {
        int updated = notificationRepository.markAllReadByUserId(userId);
        log.debug("Marked {} notifications as read for user {}", updated, userId);
    }

    // -------------------------------------------------------------------------
    // Delete
    // -------------------------------------------------------------------------

    /**
     * Deletes a single notification, verifying that it belongs to the requesting user.
     * The requesting user is identified by their email (principal name from the JWT).
     */
    @Transactional
    public void deleteNotification(Long notificationId, String requestingUserEmail) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Notification not found with id: " + notificationId));
        UUID requestingUserId = userRepository.findByEmail(requestingUserEmail)
                .map(u -> u.getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "User not found with email: " + requestingUserEmail));
        if (!notification.getUserId().equals(requestingUserId)) {
            throw new AccessDeniedException("You can only delete your own notifications");
        }
        notificationRepository.delete(notification);
        log.debug("Deleted notification {} for user {}", notificationId, requestingUserId);
    }

    /** Deletes all notifications for a user. */
    @Transactional
    public void deleteAllNotifications(UUID userId) {
        int deleted = notificationRepository.deleteAllByUserId(userId);
        log.debug("Deleted {} notifications for user {}", deleted, userId);
    }

    /**
     * Deletes only the specified notification IDs that belong to the given user.
     * IDs that belong to a different user are silently ignored (no partial failure).
     */
    @Transactional
    public void deleteSelectedNotifications(List<Long> ids, UUID userId) {
        if (ids == null || ids.isEmpty()) return;
        int deleted = notificationRepository.deleteByIdsAndUserId(ids, userId);
        log.debug("Deleted {} selected notifications for user {}", deleted, userId);
    }
}
