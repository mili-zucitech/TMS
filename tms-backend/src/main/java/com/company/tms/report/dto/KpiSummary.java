package com.company.tms.report.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class KpiSummary {
    private double totalHoursLogged;
    private double totalBillableHours;
    private double utilizationPercent;
    private int activeEmployees;
    private int activeProjects;
    private int pendingTimesheets;
}
