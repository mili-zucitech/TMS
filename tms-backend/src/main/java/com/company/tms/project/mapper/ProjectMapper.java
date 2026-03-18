package com.company.tms.project.mapper;

import com.company.tms.project.dto.ProjectAssignmentRequest;
import com.company.tms.project.dto.ProjectAssignmentResponse;
import com.company.tms.project.dto.ProjectCreateRequest;
import com.company.tms.project.dto.ProjectResponse;
import com.company.tms.project.dto.ProjectUpdateRequest;
import com.company.tms.project.entity.Project;
import com.company.tms.project.entity.ProjectAssignment;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(
        componentModel = "spring",
        nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE
)
public interface ProjectMapper {

    // -------------------------------------------------------------------------
    // Project mappings
    // -------------------------------------------------------------------------

    ProjectResponse toProjectResponse(Project project);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "projectCode", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    Project toProjectEntity(ProjectCreateRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "projectCode", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateProjectEntity(ProjectUpdateRequest request, @MappingTarget Project project);

    // -------------------------------------------------------------------------
    // ProjectAssignment mappings
    // -------------------------------------------------------------------------

    ProjectAssignmentResponse toAssignmentResponse(ProjectAssignment assignment);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    ProjectAssignment toAssignmentEntity(ProjectAssignmentRequest request);
}

