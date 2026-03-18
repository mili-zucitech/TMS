package com.company.tms.timesheet.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.util.UUID;

/** Request body for the reject endpoint. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TimesheetRejectRequest {

    private UUID approvedBy;

    @NotBlank(message = "Rejection reason is required")
    private String rejectionReason;
}
