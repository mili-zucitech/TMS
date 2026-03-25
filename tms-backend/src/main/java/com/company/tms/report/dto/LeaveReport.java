package com.company.tms.report.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class LeaveReport {
    private List<LeaveReportEntry> entries;
    private int totalApproved;
    private int totalPending;
    private int totalRejected;
    private int totalDays;
}
