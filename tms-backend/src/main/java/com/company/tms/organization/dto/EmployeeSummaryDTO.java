package com.company.tms.organization.dto;

import com.company.tms.user.entity.UserStatus;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@Builder
public class EmployeeSummaryDTO {
    private UUID id;
    private String employeeId;
    private String name;
    private String email;
    private String designation;
    private UserStatus status;
}
