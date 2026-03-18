package com.company.tms.notification.service;

import com.company.tms.notification.entity.EmailNotification;
import com.company.tms.notification.entity.EmailStatus;
import com.company.tms.notification.repository.EmailNotificationRepository;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;
    private final EmailNotificationRepository emailNotificationRepository;

    /**
     * Sends a plain-text email asynchronously and persists a tracking record.
     */
    @Async
    public void sendEmail(String recipientEmail, String subject, String body) {
        EmailNotification record = emailNotificationRepository.save(
                EmailNotification.builder()
                        .recipientEmail(recipientEmail)
                        .subject(subject)
                        .body(body)
                        .status(EmailStatus.PENDING)
                        .build()
        );

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(recipientEmail);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);

            record.setStatus(EmailStatus.SENT);
            record.setSentAt(LocalDateTime.now());
            log.info("Email sent to {}: {}", recipientEmail, subject);
        } catch (MailException e) {
            record.setStatus(EmailStatus.FAILED);
            log.error("Failed to send email to {}: {}", recipientEmail, e.getMessage());
        } finally {
            emailNotificationRepository.save(record);
        }
    }

    /**
     * Sends an HTML-formatted email asynchronously and persists a tracking record.
     */
    @Async
    public void sendHtmlEmail(String recipientEmail, String subject, String htmlBody) {
        EmailNotification record = emailNotificationRepository.save(
                EmailNotification.builder()
                        .recipientEmail(recipientEmail)
                        .subject(subject)
                        .body(htmlBody)
                        .status(EmailStatus.PENDING)
                        .build()
        );

        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, "UTF-8");
            helper.setTo(recipientEmail);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            mailSender.send(mimeMessage);

            record.setStatus(EmailStatus.SENT);
            record.setSentAt(LocalDateTime.now());
            log.info("HTML email sent to {}: {}", recipientEmail, subject);
        } catch (MailException | MessagingException e) {
            record.setStatus(EmailStatus.FAILED);
            log.error("Failed to send HTML email to {}: {}", recipientEmail, e.getMessage());
        } finally {
            emailNotificationRepository.save(record);
        }
    }

    /**
     * Convenience wrapper — sends an HTML email for in-app notification events.
     * Callers should provide a fully-formed HTML body.
     */
    @Async
    public void sendNotificationEmail(String recipientEmail, String subject, String htmlBody) {
        sendHtmlEmail(recipientEmail, subject, htmlBody);
    }
}
