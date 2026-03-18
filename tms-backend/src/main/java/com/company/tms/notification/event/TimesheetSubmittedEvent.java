package com.company.tms.notification.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.util.UUID;

/**
 * Published when a user submits a timesheet for approval.
 */
@Getter
public class TimesheetSubmittedEvent extends ApplicationEvent {

    private final UUID submittedByUserId;
    private final Long timesheetId;
    private final String submitterEmail;
    private final String submitterName;
    private final UUID managerId;
    /** Nullable — null when the submitter has no manager assigned. */
    private final String managerEmail;

    public TimesheetSubmittedEvent(Object source, UUID submittedByUserId, Long timesheetId,
                                   String submitterEmail, String submitterName,
                                   UUID managerId, String managerEmail) {
        super(source);
        this.submittedByUserId = submittedByUserId;
        this.timesheetId = timesheetId;
        this.submitterEmail = submitterEmail;
        this.submitterName = submitterName;
        this.managerId = managerId;
        this.managerEmail = managerEmail;
    }
}
