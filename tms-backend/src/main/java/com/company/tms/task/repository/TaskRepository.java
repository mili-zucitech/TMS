package com.company.tms.task.repository;

import com.company.tms.task.entity.Task;
import com.company.tms.task.entity.TaskStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {

    List<Task> findByProjectId(Long projectId);

    List<Task> findByAssignedUserId(UUID assignedUserId);

    Page<Task> findByAssignedUserId(UUID assignedUserId, Pageable pageable);

    Page<Task> findByCreatedByUserId(UUID createdByUserId, Pageable pageable);

    List<Task> findByStatus(TaskStatus status);

    List<Task> findByProjectIdAndStatus(Long projectId, TaskStatus status);

    boolean existsByTaskCode(String taskCode);

    @Query("SELECT MAX(t.taskCode) FROM Task t WHERE t.taskCode LIKE 'TSK-%'")
    java.util.Optional<String> findMaxTaskCode();
}

