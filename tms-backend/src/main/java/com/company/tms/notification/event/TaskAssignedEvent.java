package com.company.tms.notification.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.util.UUID;

/**
 * Published when a task is assigned to a user.
 */
@Getter
public class TaskAssignedEvent extends ApplicationEvent {

    private final UUID assignedToUserId;
    private final Long taskId;
    private final String taskName;
    private final String assigneeEmail;
    private final String assigneeName;

    public TaskAssignedEvent(Object source, UUID assignedToUserId, Long taskId,
                             String taskName, String assigneeEmail, String assigneeName) {
        super(source);
        this.assignedToUserId = assignedToUserId;
        this.taskId = taskId;
        this.taskName = taskName;
        this.assigneeEmail = assigneeEmail;
        this.assigneeName = assigneeName;
    }
}
