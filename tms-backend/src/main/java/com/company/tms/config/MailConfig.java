package com.company.tms.config;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;

/**
 * Validates and logs mail configuration at startup.
 *
 * <p>Fails fast (throws {@link IllegalStateException}) when MAIL_USERNAME or
 * MAIL_PASSWORD environment variables are missing or blank, so misconfiguration
 * is detected immediately rather than at the first email-send attempt.
 *
 * <p>The password is never printed; only a masked indicator is logged.
 */
@Slf4j
@Configuration
public class MailConfig {

    @Value("${spring.mail.host}")
    private String host;

    @Value("${spring.mail.port}")
    private int port;

    @Value("${spring.mail.username}")
    private String username;

    @Value("${spring.mail.password}")
    private String password;

    @PostConstruct
    public void validateAndLogMailConfiguration() {
        log.info("=== Mail Configuration ===");
        log.info("  SMTP Host : {}", host);
        log.info("  SMTP Port : {}", port);
        log.info("  Username  : {}", StringUtils.hasText(username) ? username : "<NOT SET>");
        log.info("  Password  : {}", StringUtils.hasText(password) ? "***SET***" : "<NOT SET>");
        log.info("=========================");

        if (!StringUtils.hasText(username)) {
            throw new IllegalStateException(
                    "Mail configuration error: MAIL_USERNAME environment variable is not set or is empty. "
                    + "Set it to the Gmail address used for sending emails."
            );
        }

        if (!StringUtils.hasText(password)) {
            throw new IllegalStateException(
                    "Mail configuration error: MAIL_PASSWORD environment variable is not set or is empty. "
                    + "For Gmail, generate a 16-character App Password at: "
                    + "https://myaccount.google.com/apppasswords "
                    + "(Google Account → Security → 2-Step Verification → App Passwords). "
                    + "Do NOT use your regular Gmail account password."
            );
        }

        log.info("Mail configuration validated OK — SMTP credentials are present.");
    }
}
