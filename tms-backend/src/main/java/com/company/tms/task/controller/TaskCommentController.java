package com.company.tms.task.controller;

import com.company.tms.task.dto.TaskCommentRequest;
import com.company.tms.task.dto.TaskCommentResponse;
import com.company.tms.task.service.TaskCommentService;
import com.company.tms.util.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/task-comments")
@RequiredArgsConstructor
public class TaskCommentController {

    private final TaskCommentService taskCommentService;

    /**
     * Adds a comment to a task.
     * All authenticated users (ADMIN, MANAGER, EMPLOYEE) may comment.
     */
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<TaskCommentResponse>> addComment(
            @Valid @RequestBody TaskCommentRequest request) {
        log.info("POST /api/v1/task-comments - taskId: {}", request.getTaskId());
        TaskCommentResponse created = taskCommentService.addCommentToTask(request);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success(created, "Comment added successfully"));
    }

    /**
     * Returns all comments for a task, newest first.
     */
    @GetMapping("/task/{taskId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<TaskCommentResponse>>> getCommentsByTask(
            @PathVariable Long taskId) {
        log.debug("GET /api/v1/task-comments/task/{}", taskId);
        List<TaskCommentResponse> comments = taskCommentService.getCommentsByTask(taskId);
        return ResponseEntity.ok(ApiResponse.success(comments, "Comments retrieved successfully"));
    }
}
