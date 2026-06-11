package com.company.tms.project.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

/** Effort breakdown for a project split by user, task and week. */
@Getter
@Builder
public class ProjectBreakdownResponse {
    private Long projectId;
    private List<HoursByUserEntry> hoursByUser;
    private List<HoursByTaskEntry> hoursByTask;
    private List<HoursByWeekEntry> hoursByWeek;
}
