package com.company.tms.notification.service;

import org.springframework.stereotype.Service;

/**
 * Builds branded HTML email bodies for every notification type.
 * All methods return a complete, self-contained HTML document.
 */
@Service
public class EmailTemplateService {

    // ─────────────────────────────────────────────── shared chrome ──────────

    private static String wrap(String headerColor, String headerTitle,
                               String headerSubtitle, String bodyContent) {
        return """
                <!DOCTYPE html>
                <html lang="en">
                <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width,initial-scale=1.0">
                </head>
                <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
                  <table width="100%%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding:40px 16px;">
                        <table width="600" cellpadding="0" cellspacing="0"
                               style="max-width:600px;width:100%%;background:#ffffff;border-radius:12px;
                                      overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08);">

                          <!-- HEADER -->
                          <tr>
                            <td style="background:%s;padding:36px 40px;text-align:center;">
                              <table cellpadding="0" cellspacing="0" style="margin:0 auto 16px;">
                                <tr>
                                  <td style="background:rgba(255,255,255,0.2);border-radius:12px;padding:10px 20px;">
                                    <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:2px;">TMS</span>
                                  </td>
                                </tr>
                              </table>
                              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">%s</h1>
                              <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">%s</p>
                            </td>
                          </tr>

                          <!-- BODY -->
                          <tr>
                            <td style="padding:40px;">
                              %s
                            </td>
                          </tr>

                          <!-- FOOTER -->
                          <tr>
                            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
                              <p style="margin:0 0 4px;font-size:12px;color:#6b7280;font-weight:600;">TMS &ndash; Team Management System</p>
                              <p style="margin:0;font-size:11px;color:#d1d5db;">
                                This is an automated notification &mdash; please do not reply to this email.
                              </p>
                            </td>
                          </tr>

                        </table>
                      </td>
                    </tr>
                  </table>
                </body>
                </html>
                """.formatted(headerColor, headerTitle, headerSubtitle, bodyContent);
    }

    /** Coloured status badge used inside tables. */
    private static String badge(String color, String text) {
        return "<span style=\"display:inline-block;background:%s;color:#fff;border-radius:20px;"
                .formatted(color)
                + "padding:3px 12px;font-size:12px;font-weight:700;letter-spacing:0.3px;\">"
                + text + "</span>";
    }

    /** A simple info row inside a card table. */
    private static String infoRow(String label, String value) {
        return """
                <tr>
                  <td style="padding:10px 16px;font-size:13px;color:#6b7280;font-weight:600;
                             width:40%%;border-bottom:1px solid #f3f4f6;">%s</td>
                  <td style="padding:10px 16px;font-size:13px;color:#111827;
                             border-bottom:1px solid #f3f4f6;">%s</td>
                </tr>
                """.formatted(label, value);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Timesheet — submitted (to employee)
    // ══════════════════════════════════════════════════════════════════════════

    public String timesheetSubmittedEmployee(String name, long timesheetId) {
        String body = """
                <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#111827;">Hi %s,</p>
                <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">
                  Your timesheet has been <strong style="color:#059669;">successfully submitted</strong>
                  for manager review. You will be notified once it has been actioned.
                </p>

                <table width="100%%" cellpadding="0" cellspacing="0"
                       style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:28px;">
                  %s
                  %s
                </table>

                <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
                  If you did not submit this timesheet or have any concerns, please contact your manager.
                </p>
                """.formatted(
                name,
                infoRow("Timesheet #", String.valueOf(timesheetId)),
                infoRow("Status", badge("#059669", "Submitted"))
        );
        return wrap(
                "linear-gradient(135deg,#10b981 0%%,#0d9488 100%%)",
                "&#10003; Timesheet Submitted",
                "Your timesheet is now awaiting manager approval",
                body
        );
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Timesheet — pending review (to manager)
    // ══════════════════════════════════════════════════════════════════════════

    public String timesheetPendingReview(String managerName, String employeeName,
                                         long timesheetId) {
        String body = """
                <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#111827;">Hi %s,</p>
                <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">
                  A team member has submitted their timesheet and it is
                  <strong style="color:#d97706;">awaiting your review</strong>.
                  Please log in to the TMS portal to approve or reject it.
                </p>

                <table width="100%%" cellpadding="0" cellspacing="0"
                       style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:28px;">
                  %s
                  %s
                  %s
                </table>

                <table width="100%%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                  <tr>
                    <td style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:14px 18px;">
                      <p style="margin:0;font-size:14px;color:#92400e;line-height:1.5;">
                        &#128204; Please review this timesheet at your earliest convenience to
                        ensure the employee is not left waiting.
                      </p>
                    </td>
                  </tr>
                </table>

                <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
                  Log in to <strong>TMS &rsaquo; Team Timesheets</strong> to take action.
                </p>
                """.formatted(
                managerName,
                infoRow("Employee", employeeName),
                infoRow("Timesheet #", String.valueOf(timesheetId)),
                infoRow("Status", badge("#d97706", "Pending Review"))
        );
        return wrap(
                "linear-gradient(135deg,#f59e0b 0%%,#d97706 100%%)",
                "&#128203; Timesheet Awaiting Your Review",
                "Action required &mdash; please review and approve or reject",
                body
        );
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Timesheet — approved (to employee)
    // ══════════════════════════════════════════════════════════════════════════

    public String timesheetApproved(String name, long timesheetId) {
        String body = """
                <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#111827;">Hi %s,</p>
                <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">
                  Great news! Your timesheet has been
                  <strong style="color:#059669;">approved</strong> by your manager.
                  No further action is required from your side.
                </p>

                <table width="100%%" cellpadding="0" cellspacing="0"
                       style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:28px;">
                  %s
                  %s
                </table>

                <table width="100%%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                  <tr>
                    <td style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 18px;">
                      <p style="margin:0;font-size:14px;color:#166534;line-height:1.5;">
                        &#9989; Your timesheet has been successfully reviewed and approved.
                        It will be processed for payroll as scheduled.
                      </p>
                    </td>
                  </tr>
                </table>

                <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
                  You can view your timesheet history in <strong>TMS &rsaquo; My Timesheets</strong>.
                </p>
                """.formatted(
                name,
                infoRow("Timesheet #", String.valueOf(timesheetId)),
                infoRow("Status", badge("#059669", "Approved"))
        );
        return wrap(
                "linear-gradient(135deg,#10b981 0%%,#0d9488 100%%)",
                "&#9989; Timesheet Approved",
                "Your timesheet has been approved by your manager",
                body
        );
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Timesheet — rejected (to employee)
    // ══════════════════════════════════════════════════════════════════════════

    public String timesheetRejected(String name, long timesheetId, String reason) {
        String reasonHtml = (reason != null && !reason.isBlank())
                ? """
                  <table width="100%%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                    <tr>
                      <td style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px 18px;">
                        <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#991b1b;
                                  text-transform:uppercase;letter-spacing:0.4px;">Rejection Reason</p>
                        <p style="margin:0;font-size:14px;color:#7f1d1d;line-height:1.6;">%s</p>
                      </td>
                    </tr>
                  </table>
                  """.formatted(escapeHtml(reason))
                : "";

        String body = """
                <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#111827;">Hi %s,</p>
                <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">
                  Unfortunately your timesheet has been
                  <strong style="color:#dc2626;">rejected</strong> by your manager.
                  Please review the feedback below, make the necessary corrections,
                  and re-submit.
                </p>

                <table width="100%%" cellpadding="0" cellspacing="0"
                       style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:28px;">
                  %s
                  %s
                </table>

                %s

                <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
                  Log in to <strong>TMS &rsaquo; My Timesheets</strong>, correct your entries and re-submit.
                  Contact your manager if you need clarification.
                </p>
                """.formatted(
                name,
                infoRow("Timesheet #", String.valueOf(timesheetId)),
                infoRow("Status", badge("#dc2626", "Rejected")),
                reasonHtml
        );
        return wrap(
                "linear-gradient(135deg,#ef4444 0%%,#dc2626 100%%)",
                "&#10060; Timesheet Rejected",
                "Please review the feedback and re-submit",
                body
        );
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Leave — applied (to employee)
    // ══════════════════════════════════════════════════════════════════════════

    public String leaveApplied(String name, long leaveRequestId) {
        String body = """
                <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#111827;">Hi %s,</p>
                <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">
                  Your leave request has been
                  <strong style="color:#059669;">successfully submitted</strong>
                  and is now awaiting manager approval. You will receive a notification
                  once your manager has reviewed it.
                </p>

                <table width="100%%" cellpadding="0" cellspacing="0"
                       style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:28px;">
                  %s
                  %s
                </table>

                <table width="100%%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                  <tr>
                    <td style="background:#f0fdf4;border-left:4px solid #10b981;border-radius:0 8px 8px 0;padding:14px 18px;">
                      <p style="margin:0;font-size:14px;color:#065f46;line-height:1.5;">
                        &#128337; Your request is in queue. Typical review time is 1&ndash;2 business days.
                      </p>
                    </td>
                  </tr>
                </table>

                <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
                  You can track your leave request status in <strong>TMS &rsaquo; My Leaves</strong>.
                </p>
                """.formatted(
                name,
                infoRow("Request #", String.valueOf(leaveRequestId)),
                infoRow("Status", badge("#059669", "Submitted"))
        );
        return wrap(
                "linear-gradient(135deg,#10b981 0%%,#0d9488 100%%)",
                "&#127774; Leave Request Submitted",
                "Your leave request is awaiting approval",
                body
        );
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Task — assigned (to assignee)
    // ══════════════════════════════════════════════════════════════════════════

    public String taskAssigned(String name, String taskName, long taskId) {
        String body = """
                <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#111827;">Hi %s,</p>
                <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">
                  A new task has been <strong style="color:#7c3aed;">assigned to you</strong>.
                  Please log in to the TMS portal to view the full task details, due dates,
                  and any attached notes.
                </p>

                <table width="100%%" cellpadding="0" cellspacing="0"
                       style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:28px;">
                  %s
                  %s
                  %s
                </table>

                <table width="100%%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                  <tr>
                    <td style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;padding:14px 18px;">
                      <p style="margin:0;font-size:14px;color:#4c1d95;line-height:1.5;">
                        &#128204; Visit <strong>TMS &rsaquo; Tasks</strong> to review the requirements
                        and update the status as you progress.
                      </p>
                    </td>
                  </tr>
                </table>

                <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
                  If you believe this task was assigned in error, please speak with your manager.
                </p>
                """.formatted(
                name,
                infoRow("Task", escapeHtml(taskName)),
                infoRow("Task #", String.valueOf(taskId)),
                infoRow("Status", badge("#7c3aed", "Assigned"))
        );
        return wrap(
                "linear-gradient(135deg,#7c3aed 0%%,#6d28d9 100%%)",
                "&#128221; New Task Assigned",
                "You have a new task waiting for you",
                body
        );
    }

    // ──────────────────────────────────────────────── helpers ────────────────

    private static String escapeHtml(String text) {
        if (text == null) return "";
        return text
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}
