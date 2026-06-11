package com.company.tms.report.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApprovalTurnaroundEntry {
    private String managerId;
    private String managerName;
    private int totalApproved;
    private double avgDaysToApprove;
    private double minDaysToApprove;
    private double maxDaysToApprove;
}
