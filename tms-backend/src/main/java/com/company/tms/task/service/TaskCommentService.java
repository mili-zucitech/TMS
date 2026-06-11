package com.company.tms.task.service;

import com.company.tms.task.dto.TaskCommentRequest;
import com.company.tms.task.dto.TaskCommentResponse;
import com.company.tms.task.entity.TaskComment;
import com.company.tms.task.mapper.TaskMapper;
import com.company.tms.task.repository.TaskCommentRepository;
import com.company.tms.exception.ResourceNotFoundException;
import com.company.tms.user.entity.User;
import com.company.tms.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@SuppressWarnings("null")
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TaskCommentService {

    private final TaskCommentRepository taskCommentRepository;
    private final TaskMapper taskMapper;
    private final TaskService taskService;
    private final UserRepository userRepository;

    /**
     * Adds a comment to an existing task.
     * Verifies that the parent task exists before persisting.
     */
    @Transactional
    public TaskCommentResponse addCommentToTask(TaskCommentRequest request) {
        log.info("Adding comment to taskId: {}", request.getTaskId());
        taskService.getExistingTask(request.getTaskId());

        String callerEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        User author = userRepository.findByEmail(callerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", callerEmail));

        TaskComment comment = taskMapper.toCommentEntity(request);
        comment.setUserId(author.getId()); // Always use principal — never trust client-supplied userId
        TaskCommentResponse saved = taskMapper.toCommentResponse(taskCommentRepository.save(comment));
        log.info("Comment added for taskId: {}", request.getTaskId());
        return saved;
    }

    /**
     * Returns all comments for a task, ordered newest-first.
     */
    public List<TaskCommentResponse> getCommentsByTask(Long taskId) {
        log.debug("Fetching comments for taskId: {}", taskId);
        // Ensure task exists
        taskService.getExistingTask(taskId);
        return taskCommentRepository.findByTaskIdOrderByCreatedAtDesc(taskId)
                .stream()
                .map(taskMapper::toCommentResponse)
                .toList();
    }
}
