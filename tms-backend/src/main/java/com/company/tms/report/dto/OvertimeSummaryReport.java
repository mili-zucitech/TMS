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
public class OvertimeSummaryReport {
    private List<OvertimeSummaryEntry> entries;
    private int totalOvertimeWeeks;
    private double totalOvertimeHours;
    private int affectedEmployees;
}
