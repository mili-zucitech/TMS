package com.company.tms.report.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

@Getter
@Builder
public class LeaveReportEntry {
    private UUID userId;
    private String employeeName;
    private String department;
    private String leaveType;
    private Integer totalDays;
    private String status;
    private String startDate;
    private String endDate;
}
