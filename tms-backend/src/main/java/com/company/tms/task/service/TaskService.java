package com.company.tms.task.service;

import com.company.tms.exception.ResourceNotFoundException;
import com.company.tms.task.dto.TaskCreateRequest;
import com.company.tms.user.entity.User;
import com.company.tms.user.repository.UserRepository;
import com.company.tms.task.dto.TaskResponse;
import com.company.tms.task.dto.TaskUpdateRequest;
import com.company.tms.task.entity.Task;
import com.company.tms.task.entity.TaskPriority;
import com.company.tms.task.entity.TaskStatus;
import com.company.tms.task.mapper.TaskMapper;
import com.company.tms.task.repository.TaskRepository;
import com.company.tms.task.validator.TaskValidator;
import com.company.tms.notification.event.TaskAssignedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TaskService {

    private final TaskRepository taskRepository;
    private final TaskMapper taskMapper;
    private final TaskValidator taskValidator;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * Creates a new task, recording the creator's userId.
     * Validates: task code uniqueness, project existence, assigned user is on the project, date range.
     */
    @Transactional
    public synchronized TaskResponse createTask(TaskCreateRequest request, UUID createdByUserId) {
        log.info("Creating task: {}", request.getTitle());
        taskValidator.validateProjectExists(request.getProjectId());
        taskValidator.validateUserAssignedToProject(request.getAssignedUserId(), request.getProjectId());
        taskValidator.validateDateRange(request.getStartDate(), request.getDueDate());

        Task task = taskMapper.toTaskEntity(request);
        task.setTaskCode(generateNextTaskCode());
        task.setStatus(request.getStatus() != null ? request.getStatus() : TaskStatus.TODO);
        task.setPriority(request.getPriority() != null ? request.getPriority() : TaskPriority.MEDIUM);
        task.setCreatedByUserId(createdByUserId);

        Task saved = taskRepository.save(task);
        log.info("Task created with id: {} and code: {}", saved.getId(), saved.getTaskCode());

        if (saved.getAssignedUserId() != null) {
            userRepository.findById(saved.getAssignedUserId()).ifPresent(assignee ->
                    eventPublisher.publishEvent(new TaskAssignedEvent(
                            this, assignee.getId(), saved.getId(),
                            saved.getTitle(), assignee.getEmail(), assignee.getName()
                    ))
            );
        }

        return toResponse(saved);
    }

    /**
     * Returns only the tasks created by the user identified by the given email.
     * Used for MANAGER role so they see only tasks they personally created.
     */
    public Page<TaskResponse> getTasksCreatedByUser(String email, Pageable pageable) {
        log.debug("Fetching tasks created by user: {}", email);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));
        return taskRepository.findByCreatedByUserId(user.getId(), pageable)
                .map(this::toResponse);
    }

    /**
     * Updates mutable fields of an existing task.
     * Task code and projectId are immutable after creation.
     */
    @Transactional
    public TaskResponse updateTask(Long id, TaskUpdateRequest request) {
        log.info("Updating task with id: {}", id);
        Task task = getExistingTask(id);

        if (request.getAssignedUserId() != null) {
            taskValidator.validateUserAssignedToProject(request.getAssignedUserId(), task.getProjectId());
        }

        LocalDate effectiveStart = request.getStartDate() != null ? request.getStartDate() : task.getStartDate();
        LocalDate effectiveDue   = request.getDueDate()   != null ? request.getDueDate()   : task.getDueDate();
        taskValidator.validateDateRange(effectiveStart, effectiveDue);

        taskMapper.updateTaskEntity(request, task);

        if (request.getTitle()          != null) task.setTitle(request.getTitle());
        if (request.getDescription()    != null) task.setDescription(request.getDescription());
        if (request.getAssignedUserId() != null) task.setAssignedUserId(request.getAssignedUserId());
        if (request.getPriority()       != null) task.setPriority(request.getPriority());
        if (request.getStatus()         != null) task.setStatus(request.getStatus());
        if (request.getEstimatedHours() != null) task.setEstimatedHours(request.getEstimatedHours());
        if (request.getStartDate()      != null) task.setStartDate(request.getStartDate());
        if (request.getDueDate()        != null) task.setDueDate(request.getDueDate());

        Task saved = taskRepository.save(task);
        log.info("Task updated with id: {}", saved.getId());
        return toResponse(saved);
    }

    /**
     * Retrieves a task by its ID.
     */
    public TaskResponse getTaskById(Long id) {
        log.debug("Fetching task by id: {}", id);
        return toResponse(getExistingTask(id));
    }

    /**
     * Returns a paginated list of all tasks.
     */
    public Page<TaskResponse> getAllTasks(Pageable pageable) {
        log.debug("Fetching all tasks, page: {}", pageable.getPageNumber());
        return taskRepository.findAll(pageable).map(this::toResponse);
    }

    /**
     * Returns only the tasks assigned to the user identified by the given email.
     * Used for EMPLOYEE role so they see only their own tasks.
     */
    public Page<TaskResponse> getTasksForCurrentUser(String email, Pageable pageable) {
        log.debug("Fetching tasks for current user: {}", email);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));
        return taskRepository.findByAssignedUserId(user.getId(), pageable)
                .map(this::toResponse);
    }

    /**
     * Returns all tasks belonging to a project.
     */
    public List<TaskResponse> getTasksByProject(Long projectId) {
        log.debug("Fetching tasks for projectId: {}", projectId);
        taskValidator.validateProjectExists(projectId);
        return taskRepository.findByProjectId(projectId)
                .stream().map(this::toResponse).toList();
    }

    /**
     * Returns all tasks assigned to a specific user.
     */
    public List<TaskResponse> getTasksByUser(UUID userId) {
        log.debug("Fetching tasks for userId: {}", userId);
        return taskRepository.findByAssignedUserId(userId)
                .stream().map(this::toResponse).toList();
    }

    /**
     * Updates only the status of a task.
     */
    @Transactional
    public TaskResponse updateTaskStatus(Long id, TaskStatus newStatus) {
        log.info("Updating task {} status to {}", id, newStatus);
        Task task = getExistingTask(id);
        task.setStatus(newStatus);
        return toResponse(taskRepository.save(task));
    }

    /**
     * Permanently deletes a task.
     */
    @Transactional
    public void deleteTask(Long id) {
        log.info("Deleting task with id: {}", id);
        Task task = getExistingTask(id);
        taskRepository.delete(task);
        log.info("Task deleted with id: {}", id);
    }

    // -------------------------------------------------------------------------
    // Private helper: map task to response and enrich with creator name
    // -------------------------------------------------------------------------

    private TaskResponse toResponse(Task task) {
        TaskResponse response = taskMapper.toTaskResponse(task);
        if (task.getCreatedByUserId() != null) {
            userRepository.findById(task.getCreatedByUserId())
                    .ifPresent(u -> response.setCreatedByUserName(u.getName()));
        }
        return response;
    }

    // -------------------------------------------------------------------------
    // Package-private helper used by TaskCommentService
    // -------------------------------------------------------------------------

    Task getExistingTask(Long id) {
        return taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task", "id", id));
    }

    /**
     * Returns true when the given email is the assigned user of the specified task.
     * Used in @PreAuthorize SpEL expressions.
     */
    public boolean isAssignedUser(String userEmail, Long taskId) {
        try {
            Task task = getExistingTask(taskId);
            if (task.getAssignedUserId() == null) return false;
            return userRepository.findByEmail(userEmail)
                    .map(u -> u.getId().equals(task.getAssignedUserId()))
                    .orElse(false);
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Generates the next sequential task code in the format TSK-XXXX.
     * Synchronized to prevent duplicate codes under concurrent creation requests.
     */
    private synchronized String generateNextTaskCode() {
        Optional<String> maxCode = taskRepository.findMaxTaskCode();
        if (maxCode.isEmpty()) {
            return "TSK-0001";
        }
        String max = maxCode.get();
        try {
            int seq = Integer.parseInt(max.substring(4)); // digits after "TSK-"
            return String.format("TSK-%04d", seq + 1);
        } catch (NumberFormatException e) {
            log.warn("Could not parse taskCode '{}', falling back to count-based generation", max);
            long count = taskRepository.count();
            return String.format("TSK-%04d", count + 1);
        }
    }
}
