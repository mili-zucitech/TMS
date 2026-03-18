package com.company.tms.user.mapper;

import com.company.tms.user.dto.UserCreateRequest;
import com.company.tms.user.dto.UserResponse;
import com.company.tms.user.entity.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(
        componentModel = "spring",
        nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE
)
public interface UserMapper {

    /**
     * Maps a User entity to UserResponse DTO.
     * Extracts role name from the nested Role entity.
     */
    @Mapping(source = "role.name", target = "roleName")
    UserResponse toResponse(User user);

    /**
     * Maps UserCreateRequest DTO to a User entity.
     * Fields that require special handling (role, password, status) are ignored
     * and must be set manually in the service layer.
     */
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "employeeId", ignore = true)
    @Mapping(target = "role", ignore = true)
    @Mapping(target = "passwordHash", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    User toEntity(UserCreateRequest request);

    /**
     * Applies non-null fields from UserUpdateRequest onto an existing User entity.
     * Role and password updates are handled separately in the service.
     */
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "employeeId", ignore = true)
    @Mapping(target = "email", ignore = true)
    @Mapping(target = "passwordHash", ignore = true)
    @Mapping(target = "role", ignore = true)
    @Mapping(target = "name", ignore = true)
    @Mapping(target = "phone", ignore = true)
    @Mapping(target = "departmentId", ignore = true)
    @Mapping(target = "managerId", ignore = true)
    @Mapping(target = "designation", ignore = true)
    @Mapping(target = "employmentType", ignore = true)
    @Mapping(target = "joiningDate", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateEntity(com.company.tms.user.dto.UserUpdateRequest request, @MappingTarget User user);
}

