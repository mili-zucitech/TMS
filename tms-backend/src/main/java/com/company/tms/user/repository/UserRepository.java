package com.company.tms.user.repository;

import com.company.tms.user.entity.User;
import com.company.tms.user.entity.UserStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);

    Optional<User> findByEmployeeId(String employeeId);

    List<User> findByStatus(UserStatus status);

    List<User> findByManagerId(UUID managerId);

    List<User> findByDepartmentId(Long departmentId);

    boolean existsByEmail(String email);

    boolean existsByEmployeeId(String employeeId);

    boolean existsByEmailAndIdNot(String email, UUID id);

    boolean existsByEmployeeIdAndIdNot(String employeeId, UUID id);

    @Query("SELECT MAX(u.employeeId) FROM User u WHERE u.employeeId LIKE 'EMP-%'")
    java.util.Optional<String> findMaxEmployeeId();
}
