package com.company.tms.project.validator;

import com.company.tms.exception.ValidationException;
import com.company.tms.project.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Slf4j
@Component
@RequiredArgsConstructor
public class ProjectValidator {

    private final ProjectRepository projectRepository;

    /**
     * Validates that no project already uses the given project code.
     * Used during creation.
     */
    public void validateProjectCodeUniqueness(String projectCode) {
        log.debug("Validating project code uniqueness: {}", projectCode);
        if (projectRepository.existsByProjectCode(projectCode)) {
            throw new ValidationException("Project code '" + projectCode + "' is already in use");
        }
    }

    /**
     * Validates project code uniqueness for an update, excluding the current project.
     */
    public void validateProjectCodeUniquenessForUpdate(String projectCode, Long excludeId) {
        log.debug("Validating project code uniqueness for update: {}, excludeId: {}", projectCode, excludeId);
        if (projectRepository.existsByProjectCodeAndIdNot(projectCode, excludeId)) {
            throw new ValidationException("Project code '" + projectCode + "' is already in use");
        }
    }

    /**
     * Validates that endDate is strictly after startDate when both are provided.
     */
    public void validateDateRange(LocalDate startDate, LocalDate endDate) {
        if (startDate != null && endDate != null && !endDate.isAfter(startDate)) {
            throw new ValidationException("End date must be after start date");
        }
    }
}

