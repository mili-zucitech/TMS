package com.company.tms.project.validator;

import com.company.tms.exception.ValidationException;
import com.company.tms.project.repository.ProjectAssignmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class ProjectAssignmentValidator {

    private final ProjectAssignmentRepository assignmentRepository;

    /**
     * Validates that a user is not already assigned to the same project.
     */
    public void validateNoDuplicateAssignment(UUID userId, Long projectId) {
        log.debug("Validating assignment uniqueness, userId: {}, projectId: {}", userId, projectId);
        if (assignmentRepository.existsByUserIdAndProjectId(userId, projectId)) {
            throw new ValidationException(
                    "User " + userId + " is already assigned to project " + projectId);
        }
    }

    /**
     * Validates that the assignment end date is after the start date when both are specified.
     */
    public void validateAssignmentDateRange(LocalDate startDate, LocalDate endDate) {
        if (startDate != null && endDate != null && !endDate.isAfter(startDate)) {
            throw new ValidationException("Assignment end date must be after start date");
        }
    }
}
