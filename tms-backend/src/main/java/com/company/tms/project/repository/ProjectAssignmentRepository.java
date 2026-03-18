package com.company.tms.project.repository;

import com.company.tms.project.entity.ProjectAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProjectAssignmentRepository extends JpaRepository<ProjectAssignment, Long> {

    List<ProjectAssignment> findByUserId(UUID userId);

    List<ProjectAssignment> findByProjectId(Long projectId);

    Optional<ProjectAssignment> findByUserIdAndProjectId(UUID userId, Long projectId);

    boolean existsByUserIdAndProjectId(UUID userId, Long projectId);
}

