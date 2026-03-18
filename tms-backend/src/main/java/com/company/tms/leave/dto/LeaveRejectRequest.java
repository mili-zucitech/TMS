package com.company.tms.leave.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.util.UUID;

/** Request body for leave rejection. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class LeaveRejectRequest {

    private UUID approvedBy;

    @NotBlank(message = "Rejection reason is required")
    private String rejectionReason;
}
