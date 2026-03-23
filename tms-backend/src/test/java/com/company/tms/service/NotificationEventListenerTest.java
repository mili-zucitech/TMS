package com.company.tms.service;

import com.company.tms.notification.event.LeaveAppliedEvent;
import com.company.tms.notification.event.TimesheetApprovedEvent;
import com.company.tms.notification.event.TimesheetSubmittedEvent;
import com.company.tms.notification.listener.NotificationEventListener;
import com.company.tms.notification.service.EmailService;
import com.company.tms.notification.service.EmailTemplateService;
import com.company.tms.notification.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("NotificationEventListener Tests")
class NotificationEventListenerTest {

    @Mock NotificationService notificationService;
    @Mock EmailService emailService;
    @Mock EmailTemplateService emailTemplates;
    @InjectMocks NotificationEventListener listener;

    private UUID employeeId;
    private UUID managerId;
    private Long timesheetId;
    private Long leaveId;

    @BeforeEach
    void setUp() {
        employeeId  = UUID.randomUUID();
        managerId   = UUID.randomUUID();
        timesheetId = 42L;
        leaveId     = 7L;
    }

    @Nested
    @DisplayName("onTimesheetSubmitted")
    class OnTimesheetSubmitted {

        @Test
        @DisplayName("creates in-app notification for employee and manager, sends two emails")
        void onTimesheetSubmitted_WithManager_CreatesNotificationsAndEmails() {
            when(emailTemplates.timesheetSubmittedEmployee(anyString(), anyLong()))
                    .thenReturn("<html>submitted</html>");
            when(emailTemplates.timesheetPendingReview(anyString(), anyString(), anyLong()))
                    .thenReturn("<html>pending</html>");

            TimesheetSubmittedEvent event = new TimesheetSubmittedEvent(
                    this, employeeId, timesheetId,
                    "emp@tms.com", "Test Employee",
                    managerId, "mgr@tms.com");

            listener.onTimesheetSubmitted(event);

            // Two in-app notifications (employee + manager)
            verify(notificationService, times(2)).createNotification(any());
            // Two emails (employee + manager)
            verify(emailService, times(2)).sendNotificationEmail(anyString(), anyString(), anyString());
        }

        @Test
        @DisplayName("skips manager notification when employee has no manager")
        void onTimesheetSubmitted_NoManager_OnlyEmployeeNotified() {
            when(emailTemplates.timesheetSubmittedEmployee(anyString(), anyLong()))
                    .thenReturn("<html>submitted</html>");

            TimesheetSubmittedEvent event = new TimesheetSubmittedEvent(
                    this, employeeId, timesheetId,
                    "emp@tms.com", "Test Employee",
                    null, null);   // no manager

            listener.onTimesheetSubmitted(event);

            // Only one in-app notification (employee only)
            verify(notificationService, times(1)).createNotification(any());
            // Only one email (employee only)
            verify(emailService, times(1)).sendNotificationEmail(anyString(), anyString(), anyString());
        }
    }

    @Nested
    @DisplayName("onTimesheetApproved")
    class OnTimesheetApproved {

        @Test
        @DisplayName("sends approved notification to timesheet owner")
        void onTimesheetApproved_SendsApprovedNotification() {
            when(emailTemplates.timesheetApproved(anyString(), anyLong()))
                    .thenReturn("<html>approved</html>");

            TimesheetApprovedEvent event = new TimesheetApprovedEvent(
                    this, employeeId, timesheetId,
                    "emp@tms.com", "Test Employee",
                    true, null);

            listener.onTimesheetApproved(event);

            verify(notificationService).createNotification(any());
            verify(emailService).sendNotificationEmail(anyString(), anyString(), anyString());
        }

        @Test
        @DisplayName("sends rejection notification with reason")
        void onTimesheetApproved_Rejected_SendsRejectionNotification() {
            when(emailTemplates.timesheetRejected(anyString(), anyLong(), anyString()))
                    .thenReturn("<html>rejected</html>");

            TimesheetApprovedEvent event = new TimesheetApprovedEvent(
                    this, employeeId, timesheetId,
                    "emp@tms.com", "Test Employee",
                    false, "Missing entries for Monday");

            listener.onTimesheetApproved(event);

            verify(notificationService).createNotification(any());
            verify(emailService).sendNotificationEmail(anyString(), anyString(), anyString());
        }
    }

    @Nested
    @DisplayName("onLeaveApplied")
    class OnLeaveApplied {

        @Test
        @DisplayName("creates in-app notification and sends email for leave application")
        void onLeaveApplied_SendsEmailAndNotification() {
            when(emailTemplates.leaveApplied(anyString(), anyLong()))
                    .thenReturn("<html>leave</html>");

            LeaveAppliedEvent event = new LeaveAppliedEvent(
                    this, employeeId, leaveId,
                    "emp@tms.com", "Test Employee", managerId);

            listener.onLeaveApplied(event);

            verify(notificationService, atLeastOnce()).createNotification(any());
            verify(emailService, atLeastOnce()).sendNotificationEmail(anyString(), anyString(), anyString());
        }
    }
}
