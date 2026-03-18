package com.company.tms.leave.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "leave_balances",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_leave_balances_user_type_year",
                columnNames = {"user_id", "leave_type_id", "year"}
        )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LeaveBalance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "leave_type_id", nullable = false)
    private Long leaveTypeId;

    @Column(name = "year", nullable = false)
    private Integer year;

    @Column(name = "total_allocated", nullable = false)
    private Integer totalAllocated;

    @Column(name = "used_leaves", nullable = false)
    @Builder.Default
    private Integer usedLeaves = 0;

    @Column(name = "remaining_leaves", nullable = false)
    private Integer remainingLeaves;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (usedLeaves == null) {
            usedLeaves = 0;
        }
        remainingLeaves = totalAllocated - usedLeaves;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
        remainingLeaves = totalAllocated - usedLeaves;
    }
}
