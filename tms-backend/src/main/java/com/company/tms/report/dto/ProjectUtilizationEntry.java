package com.company.tms.report.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectUtilizationEntry {
    private Long projectId;
    private String projectName;
    private double allocatedHours;
    private double loggedHours;
    private double utilizationPercent;
    private double billableHours;
    private double nonBillableHours;
    private int activeEmployees;
}
