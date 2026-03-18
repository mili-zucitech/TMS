package com.company.tms.project.entity;

/**
 * The role a user plays within a specific project assignment.
 * Distinct from the global UserRole — this reflects per-project responsibility.
 */
public enum ProjectRole {
    PROJECT_MANAGER,
    TECH_LEAD,
    DEVELOPER,
    TESTER,
    DESIGNER,
    BUSINESS_ANALYST,
    DEVOPS,
    CONSULTANT
}
