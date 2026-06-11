package com.company.tms.report.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OvertimeSummaryEntry {
    private String userId;
    private String employeeName;
    private String department;
    private String weekStartDate;
    private double totalHours;
    private double overtimeHours;
    private String overtimeReason;
}
