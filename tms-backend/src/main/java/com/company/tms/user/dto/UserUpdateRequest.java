package com.company.tms.user.dto;

import com.company.tms.user.entity.EmploymentType;
import com.company.tms.user.entity.RoleName;
import com.company.tms.user.entity.UserStatus;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
public class UserUpdateRequest {

    @Size(max = 100, message = "Name must not exceed 100 characters")
    private String name;

    @Size(max = 20, message = "Phone number must not exceed 20 characters")
    private String phone;

    private Long departmentId;

    private UUID managerId;

    @Size(max = 100, message = "Designation must not exceed 100 characters")
    private String designation;

    private RoleName roleName;

    private EmploymentType employmentType;

    private LocalDate joiningDate;

    private UserStatus status;
}
