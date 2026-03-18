package com.company.tms.notification.repository;

import com.company.tms.notification.entity.EmailNotification;
import com.company.tms.notification.entity.EmailStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EmailNotificationRepository extends JpaRepository<EmailNotification, Long> {

    List<EmailNotification> findByStatus(EmailStatus status);
}
