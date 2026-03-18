package com.company.tms.notification.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.util.UUID;

/**
 * Published when a manager approves or rejects a timesheet.
 */
@Getter
public class TimesheetApprovedEvent extends ApplicationEvent {

    private final UUID ownerUserId;
    private final Long timesheetId;
    private final String ownerEmail;
    private final String ownerName;
    /** {@code true} for approved, {@code false} for rejected. */
    private final boolean approved;
    /** Nullable — only set when {@code approved} is {@code false}. */
    private final String rejectionReason;

    public TimesheetApprovedEvent(Object source, UUID ownerUserId, Long timesheetId,
                                  String ownerEmail, String ownerName,
                                  boolean approved, String rejectionReason) {
        super(source);
        this.ownerUserId = ownerUserId;
        this.timesheetId = timesheetId;
        this.ownerEmail = ownerEmail;
        this.ownerName = ownerName;
        this.approved = approved;
        this.rejectionReason = rejectionReason;
    }
}
