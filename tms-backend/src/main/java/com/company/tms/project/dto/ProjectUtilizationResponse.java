package com.company.tms.project.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Getter;

/**
 * Summary response for a project's effort utilization and progress.
 * Fields that require estimated hours are {@code null} when no estimate is available
 * (frontend should treat null as "N/A").
 */
@Getter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ProjectUtilizationResponse {

    private Long   projectId;
    private String projectName;
    private String projectStatus;

    // ── Effort ────────────────────────────────────────────────────────────────
    /** Sum of estimated hours across all tasks. Null when no estimates exist. */
    private Double totalEstimatedHours;
    /** Total hours logged via time-entries for this project. Always present (0 when no logs). */
    private Double totalLoggedHours;
    /** Estimated – Logged. Null when no estimates exist. May be negative (over-run). */
    private Double remainingHours;

    // ── Percentages ───────────────────────────────────────────────────────────
    /** (logged / estimated) * 100. Null when no estimates exist. */
    private Double utilizationPercentage;
    /** (completed tasks / total tasks) * 100. 0 when there are no tasks. */
    private Double completionPercentage;
    /** How far through the project timeline we are (0–100). Null when dates are missing. */
    private Double timeElapsedPercentage;

    // ── Tasks ─────────────────────────────────────────────────────────────────
    private Integer totalTasks;
    private Integer completedTasks;

    // ── Health ────────────────────────────────────────────────────────────────
    /** GREEN (≤90 %), YELLOW (90–100 %), RED (>100 %), N_A (no estimates). */
    private String healthStatus;
}
