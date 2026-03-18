package com.company.tms.notification.service;

import com.company.tms.exception.ResourceNotFoundException;
import com.company.tms.notification.dto.NotificationCreateRequest;
import com.company.tms.notification.entity.NotificationType;
import com.company.tms.user.entity.User;
import com.company.tms.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReminderService {

    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final EmailService emailService;

    /**
     * Sends a timesheet-submission in-app notification and a branded HTML email
     * to the given employee.
     */
    public void sendTimesheetReminder(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        String title = "Timesheet Submission Reminder";
        String inAppMessage = "Hi " + user.getName() + ", please remember to submit your timesheet for this week. "
                + "Timesheets must be submitted by end of day Friday.";

        NotificationCreateRequest req = new NotificationCreateRequest();
        req.setUserId(userId);
        req.setTitle(title);
        req.setMessage(inAppMessage);
        req.setType(NotificationType.TIMESHEET_SUBMITTED);

        notificationService.createNotification(req);
        emailService.sendHtmlEmail(user.getEmail(), title, buildReminderHtml(user.getName()));
        log.info("Timesheet reminder sent to user {} ({})", userId, user.getEmail());
    }

    // -------------------------------------------------------------------------
    // HTML email template
    // -------------------------------------------------------------------------

    private static String buildReminderHtml(String name) {
        return """
                <!DOCTYPE html>
                <html lang="en">
                <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>Timesheet Reminder</title>
                </head>
                <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
                  <table width="100%%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding:40px 16px;">
                        <table width="600" cellpadding="0" cellspacing="0"
                               style="max-width:600px;width:100%%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08);">
                
                          <!-- HEADER -->
                          <tr>
                            <td style="background:linear-gradient(135deg,#10b981 0%%,#0d9488 100%%);padding:36px 40px;text-align:center;">
                              <table cellpadding="0" cellspacing="0" style="margin:0 auto 16px;">
                                <tr>
                                  <td style="background:rgba(255,255,255,0.2);border-radius:12px;padding:10px 20px;">
                                    <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:2px;">TMS</span>
                                  </td>
                                </tr>
                              </table>
                              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">⏰ Timesheet Submission Reminder</h1>
                              <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Action required &mdash; please read below</p>
                            </td>
                          </tr>
                
                          <!-- BODY -->
                          <tr>
                            <td style="padding:40px;">
                              <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#111827;">Hi %s,</p>
                              <p style="margin:0 0 28px;font-size:15px;color:#374151;line-height:1.7;">
                                This is a friendly reminder that your timesheet for the
                                <strong>current week</strong> is pending submission.
                                Please ensure it is submitted by
                                <strong style="color:#059669;">end of day Friday</strong>
                                to avoid any delays in payroll processing.
                              </p>
                
                              <!-- Steps box -->
                              <table width="100%%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                                <tr>
                                  <td style="background:#f0fdf4;border-left:4px solid #10b981;border-radius:0 8px 8px 0;padding:20px 24px;">
                                    <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#065f46;text-transform:uppercase;letter-spacing:0.5px;">How to submit</p>
                                    <table cellpadding="0" cellspacing="0">
                                      <tr><td style="padding:5px 0;font-size:14px;color:#374151;vertical-align:top;">
                                        <span style="display:inline-block;background:#10b981;color:#fff;border-radius:50%%;width:22px;height:22px;text-align:center;line-height:22px;font-size:11px;font-weight:700;margin-right:10px;">1</span>
                                        Log in to the TMS portal
                                      </td></tr>
                                      <tr><td style="padding:5px 0;font-size:14px;color:#374151;vertical-align:top;">
                                        <span style="display:inline-block;background:#10b981;color:#fff;border-radius:50%%;width:22px;height:22px;text-align:center;line-height:22px;font-size:11px;font-weight:700;margin-right:10px;">2</span>
                                        Navigate to <strong>Timesheets</strong> in the sidebar
                                      </td></tr>
                                      <tr><td style="padding:5px 0;font-size:14px;color:#374151;vertical-align:top;">
                                        <span style="display:inline-block;background:#10b981;color:#fff;border-radius:50%%;width:22px;height:22px;text-align:center;line-height:22px;font-size:11px;font-weight:700;margin-right:10px;">3</span>
                                        Fill in your hours for each project and task
                                      </td></tr>
                                      <tr><td style="padding:5px 0;font-size:14px;color:#374151;vertical-align:top;">
                                        <span style="display:inline-block;background:#10b981;color:#fff;border-radius:50%%;width:22px;height:22px;text-align:center;line-height:22px;font-size:11px;font-weight:700;margin-right:10px;">4</span>
                                        Click <strong>Submit for Review</strong>
                                      </td></tr>
                                    </table>
                                  </td>
                                </tr>
                              </table>
                
                              <!-- Deadline banner -->
                              <table width="100%%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                                <tr>
                                  <td style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:14px 18px;">
                                    <p style="margin:0;font-size:14px;color:#92400e;line-height:1.5;">
                                      &#9200; <strong>Deadline:</strong> End of day <strong>Friday</strong> &mdash;
                                      late submissions may delay payroll processing.
                                    </p>
                                  </td>
                                </tr>
                              </table>
                
                              <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
                                If you have already submitted your timesheet, please disregard this message.
                                For assistance, contact your manager or the HR team.
                              </p>
                            </td>
                          </tr>
                
                          <!-- FOOTER -->
                          <tr>
                            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
                              <p style="margin:0 0 4px;font-size:12px;color:#6b7280;font-weight:600;">TMS &ndash; Timesheet Manager</p>
                              <p style="margin:0;font-size:11px;color:#d1d5db;">
                                This is an automated notification. Please do not reply to this email.
                              </p>
                            </td>
                          </tr>
                
                        </table>
                      </td>
                    </tr>
                  </table>
                </body>
                </html>
                """.formatted(name);
    }
}
