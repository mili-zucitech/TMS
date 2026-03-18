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
public class BillableHoursEntry {
    private UUID userId;
    private String employeeName;
    private String department;
    private Long projectId;
    private String projectName;
    private double billableHours;
    private double nonBillableHours;
    private double totalHours;
    private int billablePercent;
}
