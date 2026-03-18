package com.company.tms.task.service;

import com.company.tms.task.dto.TaskCommentRequest;
import com.company.tms.task.dto.TaskCommentResponse;
import com.company.tms.task.entity.TaskComment;
import com.company.tms.task.mapper.TaskMapper;
import com.company.tms.task.repository.TaskCommentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TaskCommentService {

    private final TaskCommentRepository taskCommentRepository;
    private final TaskMapper taskMapper;
    private final TaskService taskService;

    /**
     * Adds a comment to an existing task.
     * Verifies that the parent task exists before persisting.
     */
    @Transactional
    public TaskCommentResponse addCommentToTask(TaskCommentRequest request) {
        log.info("Adding comment to taskId: {} by userId: {}", request.getTaskId(), request.getUserId());
        // Ensure task exists — throws ResourceNotFoundException if not
        taskService.getExistingTask(request.getTaskId());

        TaskComment comment = taskMapper.toCommentEntity(request);
        TaskComment saved = taskCommentRepository.save(comment);
        log.info("Comment added with id: {}", saved.getId());
        return taskMapper.toCommentResponse(saved);
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
