package com.company.tms.timesheet.dto;

import com.company.tms.timesheet.entity.TimesheetStatus;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TimesheetResponse {

    private Long id;
    private UUID userId;
    private LocalDate weekStartDate;
    private LocalDate weekEndDate;
    private TimesheetStatus status;
    private LocalDateTime submittedAt;
    private LocalDateTime approvedAt;
    private UUID approvedBy;
    private String rejectionReason;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
