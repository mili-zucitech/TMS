package com.company.tms.notification.repository;

import com.company.tms.notification.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByUserIdOrderByCreatedAtDesc(UUID userId);

    long countByUserIdAndIsReadFalse(UUID userId);

    // -------------------------------------------------------------------------
    // Delete operations
    // -------------------------------------------------------------------------

    /** Deletes a single notification only if it belongs to the given user (ownership check). */
    void deleteByIdAndUserId(Long id, UUID userId);

    /** Deletes all notifications for a user. */
    @Modifying
    @Query("DELETE FROM Notification n WHERE n.userId = :userId")
    int deleteAllByUserId(@Param("userId") UUID userId);

    /** Deletes only the specified notification IDs that belong to the given user. */
    @Modifying
    @Query("DELETE FROM Notification n WHERE n.id IN :ids AND n.userId = :userId")
    int deleteByIdsAndUserId(@Param("ids") List<Long> ids, @Param("userId") UUID userId);

    // -------------------------------------------------------------------------
    // Bulk read
    // -------------------------------------------------------------------------

    /** Marks all unread notifications for a user as read in a single query. */
    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.userId = :userId AND n.isRead = false")
    int markAllReadByUserId(@Param("userId") UUID userId);
}
