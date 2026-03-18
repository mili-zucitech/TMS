package com.company.tms.timesheet.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TimeEntryCreateRequest {

    @NotNull(message = "Timesheet ID is required")
    private Long timesheetId;

    @NotNull(message = "Project ID is required")
    private Long projectId;

    private Long taskId;

    private String taskNote;

    @NotNull(message = "User ID is required")
    private UUID userId;

    @NotNull(message = "Work date is required")
    private LocalDate workDate;

    @NotNull(message = "Start time is required")
    private LocalTime startTime;

    @NotNull(message = "End time is required")
    private LocalTime endTime;

    private String description;
}
