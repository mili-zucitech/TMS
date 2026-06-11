package com.company.tms.report.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskSummaryReport {
    private List<TaskSummaryEntry> entries;
    private int totalTasks;
    private int totalCompleted;
    private double overallCompletionRate;
    private double totalEstimatedHours;
    private double totalLoggedHours;
    private double totalVariance;
}
