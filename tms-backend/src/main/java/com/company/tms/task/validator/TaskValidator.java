package com.company.tms.task.validator;

import com.company.tms.exception.ValidationException;
import com.company.tms.project.repository.ProjectAssignmentRepository;
import com.company.tms.project.repository.ProjectRepository;
import com.company.tms.task.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class TaskValidator {

    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final ProjectAssignmentRepository projectAssignmentRepository;

    /**
     * Validates that the task code is not already taken.
     */
    public void validateTaskCodeUniqueness(String taskCode) {
        log.debug("Validating task code uniqueness: {}", taskCode);
        if (taskRepository.existsByTaskCode(taskCode)) {
            throw new ValidationException("Task code '" + taskCode + "' is already in use");
        }
    }

    /**
     * Validates that the referenced project exists.
     */
    public void validateProjectExists(Long projectId) {
        log.debug("Validating project existence: {}", projectId);
        if (!projectRepository.existsById(projectId)) {
            throw new ValidationException("Project with id " + projectId + " does not exist");
        }
    }

    /**
     * Validates that the assigned user is actually assigned to the project.
     * Skipped when assignedUserId is null (unassigned task).
     */
    public void validateUserAssignedToProject(UUID userId, Long projectId) {
        if (userId == null) {
            return;
        }
        log.debug("Validating user {} is assigned to project {}", userId, projectId);
        if (!projectAssignmentRepository.existsByUserIdAndProjectId(userId, projectId)) {
            throw new ValidationException(
                    "User " + userId + " is not assigned to project " + projectId +
                    ". Assign the user to the project before creating a task.");
        }
    }

    /**
     * Validates that dueDate is after startDate when both are provided.
     */
    public void validateDateRange(LocalDate startDate, LocalDate dueDate) {
        if (startDate == null || dueDate == null) {
            return;
        }
        log.debug("Validating date range: {} → {}", startDate, dueDate);
        if (!dueDate.isAfter(startDate)) {
            throw new ValidationException("Due date must be after start date");
        }
    }
}

