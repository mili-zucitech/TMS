package com.company.tms.project.service;

import com.company.tms.exception.ResourceNotFoundException;
import com.company.tms.project.dto.ProjectAssignmentRequest;
import com.company.tms.project.dto.ProjectAssignmentResponse;
import com.company.tms.project.entity.ProjectAssignment;
import com.company.tms.project.mapper.ProjectMapper;
import com.company.tms.project.repository.ProjectAssignmentRepository;
import com.company.tms.project.validator.ProjectAssignmentValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProjectAssignmentService {

    private final ProjectAssignmentRepository assignmentRepository;
    private final ProjectService projectService;
    private final ProjectMapper projectMapper;
    private final ProjectAssignmentValidator assignmentValidator;

    /**
     * Assigns a user to a project after validating:
     * <ul>
     *   <li>The project exists</li>
     *   <li>The user is not already assigned to this project</li>
     *   <li>Assignment date range is valid</li>
     * </ul>
     */
    @Transactional
    public ProjectAssignmentResponse assignUserToProject(ProjectAssignmentRequest request) {
        log.info("Assigning userId={} to projectId={}", request.getUserId(), request.getProjectId());

        // Verify project exists
        projectService.getExistingProject(request.getProjectId());

        assignmentValidator.validateNoDuplicateAssignment(request.getUserId(), request.getProjectId());
        assignmentValidator.validateAssignmentDateRange(request.getStartDate(), request.getEndDate());

        ProjectAssignment assignment = projectMapper.toAssignmentEntity(request);

        ProjectAssignment saved = assignmentRepository.save(assignment);
        log.info("Assignment created with id: {}", saved.getId());
        return projectMapper.toAssignmentResponse(saved);
    }

    /**
     * Removes a project assignment by its ID.
     */
    @Transactional
    public void removeUserFromProject(Long assignmentId) {
        log.info("Removing assignment id: {}", assignmentId);
        ProjectAssignment assignment = getExistingAssignment(assignmentId);
        assignmentRepository.delete(assignment);
        log.info("Assignment removed, id: {}", assignmentId);
    }

    /**
     * Returns all project assignments for a given user.
     */
    public List<ProjectAssignmentResponse> getProjectsByUser(UUID userId) {
        log.debug("Fetching assignments for userId: {}", userId);
        return assignmentRepository.findByUserId(userId)
                .stream()
                .map(projectMapper::toAssignmentResponse)
                .toList();
    }

    /**
     * Returns all project assignments for a given project.
     */
    public List<ProjectAssignmentResponse> getUsersByProject(Long projectId) {
        log.debug("Fetching assignments for projectId: {}", projectId);
        // Verify project exists
        projectService.getExistingProject(projectId);
        return assignmentRepository.findByProjectId(projectId)
                .stream()
                .map(projectMapper::toAssignmentResponse)
                .toList();
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private ProjectAssignment getExistingAssignment(Long id) {
        return assignmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ProjectAssignment", "id", id));
    }
}
