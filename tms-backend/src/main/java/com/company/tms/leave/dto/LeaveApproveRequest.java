package com.company.tms.leave.dto;

import lombok.*;

import java.util.UUID;

/** Request body for leave approval. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class LeaveApproveRequest {

    private UUID approvedBy;
}
