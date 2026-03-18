package com.company.tms.organization.dto;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class DepartmentUpdateRequest {

    @Size(max = 100, message = "Department name must not exceed 100 characters")
    private String name;

    @Size(max = 500, message = "Description must not exceed 500 characters")
    private String description;

    /** UUID of the user who is head/lead of this department. Set to null to clear. */
    private UUID headId;

    /** ACTIVE or INACTIVE */
    private String status;
}
