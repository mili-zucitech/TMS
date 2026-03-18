package com.company.tms.user.dto;

import com.company.tms.user.entity.EmploymentType;
import com.company.tms.user.entity.RoleName;
import com.company.tms.user.entity.UserStatus;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
public class UserResponse {

    private UUID id;
    private String employeeId;
    private String name;
    private String email;
    private String phone;
    private Long departmentId;
    private UUID managerId;
    private String designation;
    private RoleName roleName;
    private EmploymentType employmentType;
    private LocalDate joiningDate;
    private UserStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
