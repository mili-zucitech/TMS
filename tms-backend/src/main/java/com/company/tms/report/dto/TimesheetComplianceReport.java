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
public class TimesheetComplianceReport {
    private List<TimesheetComplianceEntry> entries;
    private double overallCompliancePercent;
    private int totalTimesheets;
    private int totalSubmitted;
    private int totalApproved;
    private int totalRejected;
}
