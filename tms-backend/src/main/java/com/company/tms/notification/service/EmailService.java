package com.company.tms.notification.service;

import com.company.tms.notification.entity.EmailNotification;
import com.company.tms.notification.entity.EmailStatus;
import com.company.tms.notification.repository.EmailNotificationRepository;
import jakarta.mail.AuthenticationFailedException;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailAuthenticationException;
import org.springframework.mail.MailException;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import javax.net.ssl.SSLException;
import java.net.ConnectException;
import java.net.SocketTimeoutException;
import java.net.UnknownHostException;
import java.time.LocalDateTime;

@Slf4j
@Service
public class EmailService {

    /** Maximum number of delivery attempts before marking the message as FAILED. */
    private static final int MAX_RETRIES = 3;

    /** Base delay (ms) between retries — multiplied by the attempt number (linear back-off). */
    private static final long RETRY_BASE_DELAY_MS = 2_000L;

    private final JavaMailSender mailSender;
    private final EmailNotificationRepository emailNotificationRepository;
    private final String fromAddress;

    public EmailService(
            JavaMailSender mailSender,
            EmailNotificationRepository emailNotificationRepository,
            @Value("${spring.mail.username}") String fromAddress) {
        this.mailSender = mailSender;
        this.emailNotificationRepository = emailNotificationRepository;
        this.fromAddress = fromAddress;
    }

    // =========================================================================
    // Public API — async (fire-and-forget with retry)
    // =========================================================================

    /**
     * Sends a plain-text email asynchronously with automatic retry.
     * Persists a tracking record and updates its status on each terminal outcome.
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

        Exception lastException = null;
        for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                SimpleMailMessage message = new SimpleMailMessage();
                message.setFrom(fromAddress);
                message.setTo(recipientEmail);
                message.setSubject(subject);
                message.setText(body);
                mailSender.send(message);

                record.setStatus(EmailStatus.SENT);
                record.setSentAt(LocalDateTime.now());
                emailNotificationRepository.save(record);
                log.info("[MAIL-SENT] type=plain to=[{}] subject=[{}] attempt={}", recipientEmail, subject, attempt);
                return;

            } catch (Exception e) {
                lastException = e;
                logMailException("plain", recipientEmail, subject, attempt, e);
                if (!isRetryable(e) || attempt == MAX_RETRIES) {
                    break;
                }
                sleepBeforeRetry(attempt);
            }
        }

        record.setStatus(EmailStatus.FAILED);
        emailNotificationRepository.save(record);
        log.error("[MAIL-EXHAUSTED] type=plain to=[{}] subject=[{}] — all {} attempts failed.",
                recipientEmail, subject, MAX_RETRIES, lastException);
    }

    /**
     * Sends an HTML-formatted email asynchronously with automatic retry.
     * Persists a tracking record and updates its status on each terminal outcome.
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

        Exception lastException = null;
        for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                MimeMessage mimeMessage = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, "UTF-8");
                helper.setFrom(fromAddress);
                helper.setTo(recipientEmail);
                helper.setSubject(subject);
                helper.setText(htmlBody, true);
                mailSender.send(mimeMessage);

                record.setStatus(EmailStatus.SENT);
                record.setSentAt(LocalDateTime.now());
                emailNotificationRepository.save(record);
                log.info("[MAIL-SENT] type=html to=[{}] subject=[{}] attempt={}", recipientEmail, subject, attempt);
                return;

            } catch (Exception e) {
                lastException = e;
                logMailException("html", recipientEmail, subject, attempt, e);
                if (!isRetryable(e) || attempt == MAX_RETRIES) {
                    break;
                }
                sleepBeforeRetry(attempt);
            }
        }

        record.setStatus(EmailStatus.FAILED);
        emailNotificationRepository.save(record);
        log.error("[MAIL-EXHAUSTED] type=html to=[{}] subject=[{}] — all {} attempts failed.",
                recipientEmail, subject, MAX_RETRIES, lastException);
    }

    /**
     * Convenience wrapper — sends an HTML email for in-app notification events.
     */
    @Async
    public void sendNotificationEmail(String recipientEmail, String subject, String htmlBody) {
        sendHtmlEmail(recipientEmail, subject, htmlBody);
    }

    // =========================================================================
    // Synchronous API — used by the test/health endpoints for immediate feedback
    // =========================================================================

    /**
     * Sends a test plain-text email <em>synchronously</em> (no @Async, no DB record).
     * Throws the underlying exception so the caller gets immediate diagnostics.
     */
    public void sendTestEmail(String recipientEmail) throws MailException, MessagingException {
        log.info("[MAIL-TEST] Sending test email to [{}] from [{}]", recipientEmail, fromAddress);
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo(recipientEmail);
        message.setSubject("TMS — SMTP Test Email");
        message.setText("This is a test email sent from the TMS application to verify SMTP connectivity.\n\n"
                + "If you received this message, email delivery is working correctly.");
        mailSender.send(message);
        log.info("[MAIL-TEST] Test email delivered successfully to [{}]", recipientEmail);
    }

    // =========================================================================
    // Internal helpers
    // =========================================================================

    /**
     * Logs a categorised, actionable error message depending on the root cause.
     * The full stack trace is always included so nothing is silently swallowed.
     */
    private void logMailException(String type, String to, String subject, int attempt, Exception e) {
        if (e instanceof MailAuthenticationException || isAuthFailure(e)) {
            log.error("[MAIL-AUTH-ERROR] attempt={} type={} to=[{}] subject=[{}] — "
                    + "Gmail authentication failed. Ensure MAIL_PASSWORD is a valid 16-character "
                    + "Gmail App Password, NOT your regular account password. "
                    + "Generate one at https://myaccount.google.com/apppasswords | cause: {}",
                    attempt, type, to, subject, e.getMessage(), e);

        } else if (isConnectionIssue(e)) {
            log.error("[MAIL-CONNECT-ERROR] attempt={} type={} to=[{}] subject=[{}] — "
                    + "Cannot reach SMTP server. Verify smtp.gmail.com:587 is reachable from this host "
                    + "(check outbound firewall / egress rules on port 587). | cause: {}",
                    attempt, type, to, subject, e.getMessage(), e);

        } else if (isTlsIssue(e)) {
            log.error("[MAIL-TLS-ERROR] attempt={} type={} to=[{}] subject=[{}] — "
                    + "TLS/STARTTLS negotiation failed. Confirm spring.mail.properties.mail.smtp.starttls.enable=true "
                    + "and that the JVM trust-store includes the Gmail certificate. | cause: {}",
                    attempt, type, to, subject, e.getMessage(), e);

        } else {
            log.error("[MAIL-SEND-ERROR] attempt={} type={} to=[{}] subject=[{}] cause: {}",
                    attempt, type, to, subject, e.getMessage(), e);
        }
    }

    /** Authentication errors are not retryable — credentials will not change between attempts. */
    private boolean isRetryable(Exception e) {
        return !(e instanceof MailAuthenticationException) && !isAuthFailure(e);
    }

    private boolean isAuthFailure(Exception e) {
        Throwable root = rootCause(e);
        if (root instanceof AuthenticationFailedException) {
            return true;
        }
        String msg = root.getMessage() != null ? root.getMessage() : "";
        return msg.contains("535") || msg.contains("Authentication") || msg.contains("Username and Password not accepted");
    }

    private boolean isConnectionIssue(Exception e) {
        Throwable root = rootCause(e);
        return root instanceof ConnectException
                || root instanceof SocketTimeoutException
                || root instanceof UnknownHostException
                || (e instanceof MailSendException && root instanceof UnknownHostException);
    }

    private boolean isTlsIssue(Exception e) {
        Throwable root = rootCause(e);
        if (root instanceof SSLException) {
            return true;
        }
        String msg = root.getMessage() != null ? root.getMessage().toLowerCase() : "";
        return msg.contains("tls") || msg.contains("ssl") || msg.contains("starttls");
    }

    private Throwable rootCause(Throwable t) {
        Throwable cause = t;
        while (cause.getCause() != null && cause.getCause() != cause) {
            cause = cause.getCause();
        }
        return cause;
    }

    private void sleepBeforeRetry(int attempt) {
        long delay = RETRY_BASE_DELAY_MS * attempt;
        log.info("[MAIL-RETRY] Waiting {}ms before attempt {}", delay, attempt + 1);
        try {
            Thread.sleep(delay);
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
        }
    }
}
