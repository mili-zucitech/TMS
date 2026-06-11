package com.company.tms.report.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TimesheetComplianceEntry {
    private String userId;
    private String employeeName;
    private String department;
    private int totalTimesheets;
    private int submitted;
    private int approved;
    private int rejected;
    private int draft;
    private double compliancePercent;
}
