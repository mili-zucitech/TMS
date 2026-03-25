package com.company.tms.notification.controller;

import com.company.tms.notification.service.EmailService;
import com.company.tms.util.ApiResponse;
import jakarta.mail.MessagingException;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Provides two operational endpoints for mail diagnostics:
 *
 * <ul>
 *   <li>{@code GET  /health/mail}              — verifies SMTP connectivity (no auth required).</li>
 *   <li>{@code POST /api/v1/admin/test-email}  — sends a live test email (ADMIN only).</li>
 * </ul>
 *
 * <p>These endpoints are intentionally kept outside the normal API path so that
 * monitoring tools and operations teams can reach {@code /health/mail} without a JWT.
 */
@Slf4j
@Validated
@RestController
public class MailController {

    private final JavaMailSenderImpl mailSender;
    private final EmailService emailService;

    /**
     * Inject {@link JavaMailSenderImpl} directly (not the interface) so we can call
     * {@link JavaMailSenderImpl#testConnection()} which is absent from the interface.
     * Spring Boot's mail auto-configuration always registers an instance of this class.
     */
    public MailController(JavaMailSenderImpl mailSender, EmailService emailService) {
        this.mailSender = mailSender;
        this.emailService = emailService;
    }

    // =========================================================================
    // SMTP health check — no authentication required
    // =========================================================================

    /**
     * Tests the SMTP connection by performing a server handshake without sending a message.
     *
     * <p>Returns HTTP 200 when the server is reachable, HTTP 503 otherwise.
     * The response body always contains {@code host} and {@code port} so ops teams
     * can verify which server is being tested.
     *
     * <p>Safe to expose publicly — does not reveal credentials or message content.
     */
    @GetMapping("/health/mail")
    public ResponseEntity<ApiResponse<Map<String, Object>>> smtpHealthCheck() {
        log.info("[MAIL-HEALTH] SMTP connectivity check requested (host={}, port={})",
                mailSender.getHost(), mailSender.getPort());
        try {
            mailSender.testConnection();

            Map<String, Object> details = new LinkedHashMap<>();
            details.put("status", "UP");
            details.put("host", mailSender.getHost());
            details.put("port", mailSender.getPort());

            log.info("[MAIL-HEALTH] SMTP connection OK ({}:{})", mailSender.getHost(), mailSender.getPort());
            return ResponseEntity.ok(
                    ApiResponse.success(details, "SMTP connection successful"));

        } catch (MessagingException e) {
            log.error("[MAIL-HEALTH] SMTP connection FAILED ({}:{}) — {}",
                    mailSender.getHost(), mailSender.getPort(), e.getMessage(), e);

            Map<String, Object> details = new LinkedHashMap<>();
            details.put("status", "DOWN");
            details.put("host", mailSender.getHost());
            details.put("port", mailSender.getPort());
            details.put("reason", e.getMessage());

            return ResponseEntity.status(503).body(
                    ApiResponse.error("SMTP_UNAVAILABLE",
                            "SMTP connection failed: " + e.getMessage()));
        }
    }

    // =========================================================================
    // Test email — ADMIN only
    // =========================================================================

    /**
     * Sends a test email <em>synchronously</em> so the caller gets immediate pass/fail feedback.
     *
     * <p>Usage: {@code POST /api/v1/admin/test-email?to=someone@example.com}
     *
     * <p>Returns HTTP 200 on success, HTTP 500 on failure with a diagnostic message.
     * Authentication failures, connection timeouts, and TLS errors are all surfaced
     * with actionable error text in the response body.
     */
    @PostMapping("/api/v1/admin/test-email")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<String>> sendTestEmail(
            @RequestParam @Email(message = "Must be a valid email address")
            @NotBlank(message = "Recipient email must not be blank") String to) {

        log.info("[MAIL-TEST] Test email requested to [{}]", to);
        try {
            emailService.sendTestEmail(to);
            return ResponseEntity.ok(
                    ApiResponse.success("Test email successfully sent to " + to));

        } catch (MailException e) {
            String diagnosis = diagnoseMailException(e);
            log.error("[MAIL-TEST] Send failed to [{}] — {} | cause: {}", to, diagnosis, e.getMessage(), e);
            return ResponseEntity.internalServerError().body(
                    ApiResponse.error("TEST_EMAIL_FAILED", diagnosis + " | Detail: " + e.getMessage()));

        } catch (MessagingException e) {
            log.error("[MAIL-TEST] Messaging error for [{}]: {}", to, e.getMessage(), e);
            return ResponseEntity.internalServerError().body(
                    ApiResponse.error("TEST_EMAIL_FAILED", "Messaging error: " + e.getMessage()));
        }
    }

    // =========================================================================
    // Internal helpers
    // =========================================================================

    private String diagnoseMailException(MailException e) {
        String msg = e.getMessage() != null ? e.getMessage().toLowerCase() : "";
        Throwable cause = e.getCause();
        String causeMsg = (cause != null && cause.getMessage() != null) ? cause.getMessage().toLowerCase() : "";

        if (msg.contains("535") || msg.contains("authentication") || causeMsg.contains("authentication")
                || cause instanceof jakarta.mail.AuthenticationFailedException) {
            return "Gmail authentication failed — ensure MAIL_PASSWORD is a valid App Password "
                    + "(https://myaccount.google.com/apppasswords), not your account password.";
        }
        if (cause instanceof java.net.ConnectException || cause instanceof java.net.SocketTimeoutException
                || cause instanceof java.net.UnknownHostException) {
            return "Cannot reach SMTP server " + mailSender.getHost() + ":" + mailSender.getPort()
                    + " — check outbound firewall/egress rules on port 587.";
        }
        if (causeMsg.contains("tls") || causeMsg.contains("ssl") || causeMsg.contains("starttls")
                || cause instanceof javax.net.ssl.SSLException) {
            return "TLS/STARTTLS negotiation failed — verify spring.mail.properties.mail.smtp.starttls.enable=true.";
        }
        return "Mail send error — check logs for full stack trace.";
    }
}
