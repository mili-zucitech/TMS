package com.company.tms.report.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeHoursEntry {
    private UUID userId;
    private String employeeName;
    private String department;
    private double totalHours;
    private double billableHours;
    private double nonBillableHours;
    private String weekStartDate;
}
