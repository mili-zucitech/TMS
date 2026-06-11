package com.company.tms.project.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

/** Hours logged by a single user on a project. */
@Getter
@AllArgsConstructor
public class HoursByUserEntry {
    private String userId;
    /** Display name resolved from the User entity. May be null if user not found. */
    private String userName;
    private Double hours;
}
