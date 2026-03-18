package com.company.tms.task.mapper;

import com.company.tms.task.dto.TaskCommentRequest;
import com.company.tms.task.dto.TaskCommentResponse;
import com.company.tms.task.dto.TaskCreateRequest;
import com.company.tms.task.dto.TaskResponse;
import com.company.tms.task.dto.TaskUpdateRequest;
import com.company.tms.task.entity.Task;
import com.company.tms.task.entity.TaskComment;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(
        componentModel = "spring",
        nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE
)
public interface TaskMapper {

    // -------------------------------------------------------------------------
    // Task mappings
    // -------------------------------------------------------------------------

    TaskResponse toTaskResponse(Task task);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "taskCode", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "createdByUserId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    Task toTaskEntity(TaskCreateRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "taskCode", ignore = true)
    @Mapping(target = "projectId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateTaskEntity(TaskUpdateRequest request, @MappingTarget Task task);

    // -------------------------------------------------------------------------
    // TaskComment mappings
    // -------------------------------------------------------------------------

    TaskCommentResponse toCommentResponse(TaskComment comment);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    TaskComment toCommentEntity(TaskCommentRequest request);
}

