package com.company.tms.notification.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.util.UUID;

/**
 * Published when a user submits a new leave request.
 */
@Getter
public class LeaveAppliedEvent extends ApplicationEvent {

    private final UUID applicantUserId;
    private final Long leaveRequestId;
    private final String applicantEmail;
    private final String applicantName;
    private final UUID managerId;

    public LeaveAppliedEvent(Object source, UUID applicantUserId, Long leaveRequestId,
                             String applicantEmail, String applicantName, UUID managerId) {
        super(source);
        this.applicantUserId = applicantUserId;
        this.leaveRequestId = leaveRequestId;
        this.applicantEmail = applicantEmail;
        this.applicantName = applicantName;
        this.managerId = managerId;
    }
}
