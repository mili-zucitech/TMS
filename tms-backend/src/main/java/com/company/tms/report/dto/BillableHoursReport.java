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
public class BillableHoursReport {
    private List<BillableHoursEntry> entries;
    private double totalBillableHours;
    private double totalNonBillableHours;
    private double totalHours;
    private int overallBillablePercent;
}
