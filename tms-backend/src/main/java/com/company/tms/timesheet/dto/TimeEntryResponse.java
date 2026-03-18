package com.company.tms.timesheet.dto;

import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TimeEntryResponse {

    private Long id;
    private Long timesheetId;
    private Long projectId;
    private Long taskId;
    private String taskNote;
    private UUID userId;
    private LocalDate workDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private Integer durationMinutes;
    private String description;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
