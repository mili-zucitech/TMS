package com.company.tms.report.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskSummaryEntry {
    private Long projectId;
    private String projectName;
    private int totalTasks;
    private int completedTasks;
    private int inProgressTasks;
    private int blockedTasks;
    private int todoTasks;
    private double completionRate;
    private double estimatedHours;
    private double loggedHours;
    private double variance;
}
