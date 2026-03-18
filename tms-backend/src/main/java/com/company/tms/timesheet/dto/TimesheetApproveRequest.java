package com.company.tms.timesheet.dto;

import lombok.*;

import java.util.UUID;

/** Request body for the approve endpoint — approvedBy is optional. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TimesheetApproveRequest {

    private UUID approvedBy;
}
