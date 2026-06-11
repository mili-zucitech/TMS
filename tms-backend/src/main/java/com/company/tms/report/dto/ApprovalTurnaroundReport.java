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
public class ApprovalTurnaroundReport {
    private List<ApprovalTurnaroundEntry> entries;
    private double orgAvgDaysToApprove;
    private int totalApproved;
}
