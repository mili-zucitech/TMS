package com.company.tms.organization.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;
import lombok.Setter;

import java.util.List;
import java.util.UUID;

@Getter
@Setter
public class DepartmentMembersRequest {

    @NotEmpty(message = "At least one user ID is required")
    private List<UUID> userIds;
}
