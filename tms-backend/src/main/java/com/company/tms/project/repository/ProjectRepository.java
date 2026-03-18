package com.company.tms.project.repository;

import com.company.tms.project.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {

    Optional<Project> findByProjectCode(String projectCode);

    boolean existsByProjectCode(String projectCode);

    boolean existsByProjectCodeAndIdNot(String projectCode, Long id);

    List<Project> findByDepartmentId(Long departmentId);

    @Query("SELECT MAX(p.projectCode) FROM Project p WHERE p.projectCode LIKE 'PRJ-%'")
    java.util.Optional<String> findMaxProjectCode();
}

