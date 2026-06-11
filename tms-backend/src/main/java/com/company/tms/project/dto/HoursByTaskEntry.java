package com.company.tms.project.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

/** Hours logged against a specific task on a project. */
@Getter
@AllArgsConstructor
public class HoursByTaskEntry {
    private Long taskId;
    /** Task title resolved from the Task entity. May be null for untracked tasks. */
    private String taskTitle;
    private Double hours;
}
