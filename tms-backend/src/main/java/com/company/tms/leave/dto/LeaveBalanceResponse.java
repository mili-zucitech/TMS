package com.company.tms.leave.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LeaveBalanceResponse {

    private Long id;
    private UUID userId;
    private Long leaveTypeId;
    private String leaveTypeName;
    private Integer year;
    private Integer totalAllocated;
    private Integer usedLeaves;
    private Integer remainingLeaves;
    private LocalDateTime updatedAt;
}
