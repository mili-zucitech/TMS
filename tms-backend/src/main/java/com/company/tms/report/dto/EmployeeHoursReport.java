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
public class EmployeeHoursReport {
    private List<EmployeeHoursEntry> entries;
    private double totalHours;
    private double totalBillableHours;
    private double totalNonBillableHours;
    private int employeeCount;
}
