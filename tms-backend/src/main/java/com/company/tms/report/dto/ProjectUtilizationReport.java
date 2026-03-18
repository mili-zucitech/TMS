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
public class ProjectUtilizationReport {
    private List<ProjectUtilizationEntry> entries;
    private double totalAllocatedHours;
    private double totalLoggedHours;
    private double avgUtilizationPercent;
}
