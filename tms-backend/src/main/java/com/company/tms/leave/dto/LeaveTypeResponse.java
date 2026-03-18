package com.company.tms.leave.dto;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LeaveTypeResponse {

    private Long id;
    private String name;
    private String description;
    private Integer defaultAnnualAllocation;
    private Boolean requiresApproval;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
