package com.company.tms.project.service;

import com.company.tms.exception.ResourceNotFoundException;
import com.company.tms.project.dto.ProjectCreateRequest;
import com.company.tms.project.dto.ProjectResponse;
import com.company.tms.project.dto.ProjectUpdateRequest;
import com.company.tms.project.entity.Project;
import com.company.tms.project.entity.ProjectAssignment;
import com.company.tms.project.entity.ProjectRole;
import com.company.tms.project.entity.ProjectStatus;
import com.company.tms.project.mapper.ProjectMapper;
import com.company.tms.project.repository.ProjectAssignmentRepository;
import com.company.tms.project.repository.ProjectRepository;
import com.company.tms.project.validator.ProjectValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

@SuppressWarnings("null")
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final ProjectAssignmentRepository projectAssignmentRepository;
    private final ProjectMapper projectMapper;
    private final ProjectValidator projectValidator;

    /**
     * Creates a new project after validating code uniqueness and date range.
     */
    @Transactional
    public synchronized ProjectResponse createProject(ProjectCreateRequest request) {
        log.info("Creating project: {}", request.getName());

        projectValidator.validateDateRange(request.getStartDate(), request.getEndDate());

        Project project = projectMapper.toProjectEntity(request);
        project.setProjectCode(generateNextProjectCode());
        project.setStatus(request.getStatus() != null ? request.getStatus() : ProjectStatus.PLANNED);

        Project saved = projectRepository.save(project);
        log.info("Project created with id: {} and code: {}", saved.getId(), saved.getProjectCode());

        // Auto-assign the project manager as a member so they can log time immediately.
        if (saved.getProjectManagerId() != null) {
            autoAssignManager(saved.getId(), saved.getProjectManagerId(), saved);
        }

        return projectMapper.toProjectResponse(saved);
    }

    /**
     * Updates mutable fields of an existing project.
     * Project code is immutable after creation.
     */
    @Transactional
    public ProjectResponse updateProject(Long id, ProjectUpdateRequest request) {
        log.info("Updating project with id: {}", id);
        Project project = getExistingProject(id);

        projectValidator.validateDateRange(
                request.getStartDate() != null ? request.getStartDate() : project.getStartDate(),
                request.getEndDate()   != null ? request.getEndDate()   : project.getEndDate()
        );

        UUID oldManagerId = project.getProjectManagerId();

        projectMapper.updateProjectEntity(request, project);

        if (request.getName()             != null) project.setName(request.getName());
        if (request.getDescription()      != null) project.setDescription(request.getDescription());
        if (request.getClientName()       != null) project.setClientName(request.getClientName());
        if (request.getDepartmentId()     != null) project.setDepartmentId(request.getDepartmentId());
        if (request.getProjectManagerId() != null) project.setProjectManagerId(request.getProjectManagerId());
        if (request.getStartDate()        != null) project.setStartDate(request.getStartDate());
        if (request.getEndDate()          != null) project.setEndDate(request.getEndDate());
        if (request.getStatus()           != null) project.setStatus(request.getStatus());

        Project saved = projectRepository.save(project);

        // Keep project assignments in sync when the manager changes.
        UUID newManagerId = request.getProjectManagerId();
        if (newManagerId != null && !newManagerId.equals(oldManagerId)) {
            // Remove the old manager's auto-assigned PROJECT_MANAGER entry (if present).
            if (oldManagerId != null) {
                projectAssignmentRepository
                        .findByUserIdAndProjectId(oldManagerId, saved.getId())
                        .ifPresent(a -> {
                            if (a.getRole() == ProjectRole.PROJECT_MANAGER) {
                                projectAssignmentRepository.delete(a);
                                log.info("Removed PROJECT_MANAGER assignment for old manager userId={} on projectId={}",
                                        oldManagerId, saved.getId());
                            }
                        });
            }
            // Assign the new manager (skip if they already have any assignment on this project).
            autoAssignManager(saved.getId(), newManagerId, saved);
        }

        log.info("Project updated with id: {}", saved.getId());
        return projectMapper.toProjectResponse(saved);
    }

    /**
     * Retrieves a project by its ID.
     */
    public ProjectResponse getProjectById(Long id) {
        log.debug("Fetching project by id: {}", id);
        return projectMapper.toProjectResponse(getExistingProject(id));
    }

    /**
     * Returns a paginated list of all projects.
     */
    public Page<ProjectResponse> getAllProjects(Pageable pageable) {
        log.debug("Fetching all projects, page: {}", pageable.getPageNumber());
        return projectRepository.findAll(pageable).map(projectMapper::toProjectResponse);
    }

    /**
     * Archives a project by transitioning its status to CANCELLED.
     * Archived projects are retained for reporting purposes.
     */
    @Transactional
    public ProjectResponse archiveProject(Long id) {
        log.info("Archiving project with id: {}", id);
        Project project = getExistingProject(id);
        project.setStatus(ProjectStatus.CANCELLED);
        Project saved = projectRepository.save(project);
        log.info("Project archived with id: {}", id);
        return projectMapper.toProjectResponse(saved);
    }

    // -------------------------------------------------------------------------
    // Package-private helpers
    // -------------------------------------------------------------------------

    Project getExistingProject(Long id) {
        return projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project", "id", id));
    }
    /**
     * Generates the next sequential project code in the format PRJ-XXXX.
     * Synchronized to prevent duplicate codes under concurrent creation requests.
     */
    /**
     * Creates a PROJECT_MANAGER assignment for the given user unless they already
     * have any assignment on this project.
     */
    private void autoAssignManager(Long projectId, UUID managerId, Project project) {
        if (projectAssignmentRepository.existsByUserIdAndProjectId(managerId, projectId)) {
            log.debug("Manager userId={} already assigned to projectId={}, skipping auto-assign", managerId, projectId);
            return;
        }
        ProjectAssignment assignment = ProjectAssignment.builder()
                .projectId(projectId)
                .userId(managerId)
                .role(ProjectRole.PROJECT_MANAGER)
                .allocationPercentage(BigDecimal.valueOf(100))
                .startDate(project.getStartDate())
                .endDate(project.getEndDate())
                .build();
        projectAssignmentRepository.save(assignment);
        log.info("Auto-assigned PROJECT_MANAGER userId={} to projectId={}", managerId, projectId);
    }

    private String generateNextProjectCode() {
        Optional<String> maxCode = projectRepository.findMaxProjectCode();
        if (maxCode.isEmpty()) {
            return "PRJ-0001";
        }
        String max = maxCode.get();
        try {
            int seq = Integer.parseInt(max.substring(4)); // digits after "PRJ-"
            return String.format("PRJ-%04d", seq + 1);
        } catch (NumberFormatException e) {
            log.warn("Could not parse projectCode '{}', falling back to count-based generation", max);
            long count = projectRepository.count();
            return String.format("PRJ-%04d", count + 1);
        }
    }}

