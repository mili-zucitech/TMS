package com.company.tms.timesheet.dto;

import lombok.*;

import java.time.LocalDate;
import java.time.LocalTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TimeEntryUpdateRequest {

    private Long projectId;
    private Long taskId;
    private String taskNote;
    private LocalDate workDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private String description;
}
