package com.company.tms.project.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

/** Hours logged in a specific ISO week, e.g. "2026-W13". */
@Getter
@AllArgsConstructor
public class HoursByWeekEntry {
    /** ISO week label, format "YYYY-Www", e.g. "2026-W13". */
    private String weekLabel;
    private Double hours;
}
