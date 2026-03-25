package com.company.tms.notification.listener;

import com.company.tms.notification.dto.NotificationCreateRequest;
import com.company.tms.notification.entity.NotificationType;
import com.company.tms.notification.event.*;
import com.company.tms.notification.service.EmailService;
import com.company.tms.notification.service.EmailTemplateService;
import com.company.tms.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * Listens for domain events and creates in-app + HTML email notifications.
 *
 * <p>All handler methods are {@link Async} so they do not block the
 * transaction that published the event.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationEventListener {

    private final NotificationService notificationService;
    private final EmailService emailService;
    private final EmailTemplateService emailTemplates;

    // -------------------------------------------------------------------------
    // Timesheet events
    // -------------------------------------------------------------------------

    @Async
    @EventListener
    public void onTimesheetSubmitted(TimesheetSubmittedEvent event) {
        log.debug("Handling TimesheetSubmittedEvent for timesheet {}", event.getTimesheetId());

        // In-app: confirm submission to the employee
        NotificationCreateRequest employeeNotif = new NotificationCreateRequest();
        employeeNotif.setUserId(event.getSubmittedByUserId());
        employeeNotif.setTitle("Timesheet Submitted");
        employeeNotif.setMessage("Your timesheet #" + event.getTimesheetId() + " has been submitted for approval.");
        employeeNotif.setType(NotificationType.TIMESHEET_SUBMITTED);
        employeeNotif.setReferenceId(event.getTimesheetId().toString());
        employeeNotif.setReferenceType("TIMESHEET");
        notificationService.createNotification(employeeNotif);

        // HTML email: confirm to the employee
        emailService.sendNotificationEmail(
                event.getSubmitterEmail(),
                "Timesheet Submitted \u2014 #" + event.getTimesheetId(),
                emailTemplates.timesheetSubmittedEmployee(event.getSubmitterName(), event.getTimesheetId())
        );

        // In-app + HTML email: alert the manager
        if (event.getManagerId() != null) {
            NotificationCreateRequest managerNotif = new NotificationCreateRequest();
            managerNotif.setUserId(event.getManagerId());
            managerNotif.setTitle("Timesheet Pending Review");
            managerNotif.setMessage(event.getSubmitterName() + " has submitted timesheet #"
                    + event.getTimesheetId() + " and is awaiting your approval.");
            managerNotif.setType(NotificationType.TIMESHEET_SUBMITTED);
            managerNotif.setReferenceId(event.getTimesheetId().toString());
            managerNotif.setReferenceType("TIMESHEET");
            notificationService.createNotification(managerNotif);

            if (event.getManagerEmail() != null) {
                emailService.sendNotificationEmail(
                        event.getManagerEmail(),
                        "Timesheet Pending Review \u2014 " + event.getSubmitterName(),
                        emailTemplates.timesheetPendingReview(
                                // manager name not available in the event; use a generic greeting
                                "Manager",
                                event.getSubmitterName(),
                                event.getTimesheetId()
                        )
                );
            }
        }
    }

    @Async
    @EventListener
    public void onTimesheetApproved(TimesheetApprovedEvent event) {
        log.debug("Handling TimesheetApprovedEvent for timesheet {} approved={}",
                event.getTimesheetId(), event.isApproved());

        String title = event.isApproved() ? "Timesheet Approved" : "Timesheet Rejected";
        String inAppMessage;
        if (event.isApproved()) {
            inAppMessage = "Your timesheet #" + event.getTimesheetId() + " has been approved.";
        } else {
            inAppMessage = "Your timesheet #" + event.getTimesheetId() + " has been rejected.";
            if (event.getRejectionReason() != null && !event.getRejectionReason().isBlank()) {
                inAppMessage += " Reason: " + event.getRejectionReason();
            }
        }

        // In-app: notify the timesheet owner
        NotificationCreateRequest inApp = new NotificationCreateRequest();
        inApp.setUserId(event.getOwnerUserId());
        inApp.setTitle(title);
        inApp.setMessage(inAppMessage);
        inApp.setType(event.isApproved() ? NotificationType.TIMESHEET_APPROVED : NotificationType.TIMESHEET_REJECTED);
        inApp.setReferenceId(event.getTimesheetId().toString());
        inApp.setReferenceType("TIMESHEET");
        notificationService.createNotification(inApp);

        // HTML email: notify the timesheet owner
        String htmlBody = event.isApproved()
                ? emailTemplates.timesheetApproved(event.getOwnerName(), event.getTimesheetId())
                : emailTemplates.timesheetRejected(event.getOwnerName(), event.getTimesheetId(), event.getRejectionReason());

        emailService.sendNotificationEmail(
                event.getOwnerEmail(),
                title + " \u2014 #" + event.getTimesheetId(),
                htmlBody
        );
    }

    // -------------------------------------------------------------------------
    // Leave events
    // -------------------------------------------------------------------------

    @Async
    @EventListener
    public void onLeaveApplied(LeaveAppliedEvent event) {
        log.debug("Handling LeaveAppliedEvent for leave request {}", event.getLeaveRequestId());

        // In-app: notify the applicant
        NotificationCreateRequest inApp = new NotificationCreateRequest();
        inApp.setUserId(event.getApplicantUserId());
        inApp.setTitle("Leave Request Submitted");
        inApp.setMessage("Your leave request #" + event.getLeaveRequestId() + " has been submitted.");
        inApp.setType(NotificationType.LEAVE_APPLIED);
        inApp.setReferenceId(event.getLeaveRequestId().toString());
        inApp.setReferenceType("LEAVE_REQUEST");
        notificationService.createNotification(inApp);

        // HTML email: notify the applicant
        emailService.sendNotificationEmail(
                event.getApplicantEmail(),
                "Leave Request Submitted \u2014 #" + event.getLeaveRequestId(),
                emailTemplates.leaveApplied(event.getApplicantName(), event.getLeaveRequestId())
        );
    }

    // -------------------------------------------------------------------------
    // Task events
    // -------------------------------------------------------------------------

    @Async
    @EventListener
    public void onTaskAssigned(TaskAssignedEvent event) {
        log.debug("Handling TaskAssignedEvent for task {}", event.getTaskId());

        // In-app
        NotificationCreateRequest inApp = new NotificationCreateRequest();
        inApp.setUserId(event.getAssignedToUserId());
        inApp.setTitle("Task Assigned");
        inApp.setMessage("You have been assigned to task: " + event.getTaskName());
        inApp.setType(NotificationType.TASK_ASSIGNED);
        inApp.setReferenceId(event.getTaskId().toString());
        inApp.setReferenceType("TASK");
        notificationService.createNotification(inApp);

        // HTML email
        emailService.sendNotificationEmail(
                event.getAssigneeEmail(),
                "New Task Assigned: " + event.getTaskName(),
                emailTemplates.taskAssigned(event.getAssigneeName(), event.getTaskName(), event.getTaskId())
        );
    }
}
