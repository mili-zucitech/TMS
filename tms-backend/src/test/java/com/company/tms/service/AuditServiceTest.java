package com.company.tms.service;

import com.company.tms.audit.dto.AuditLogResponse;
import com.company.tms.audit.entity.AuditAction;
import com.company.tms.audit.entity.AuditLog;
import com.company.tms.audit.mapper.AuditMapper;
import com.company.tms.audit.repository.AuditRepository;
import com.company.tms.audit.service.AuditService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuditService Tests")
class AuditServiceTest {

    @Mock AuditRepository auditRepository;
    @Mock AuditMapper auditMapper;
    @InjectMocks AuditService auditService;

    private AuditLog sampleLog;
    private AuditLogResponse sampleResponse;
    private UUID userId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        sampleLog = AuditLog.builder()
                .id(1L)
                .userId(userId)
                .action(AuditAction.LOGIN)
                .entityType("User")
                .entityId(userId.toString())
                .description("User logged in")
                .createdAt(LocalDateTime.now())
                .build();

        sampleResponse = AuditLogResponse.builder()
                .id(1L)
                .userId(userId)
                .action(AuditAction.LOGIN)
                .entityType("User")
                .entityId(userId.toString())
                .description("User logged in")
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Nested
    @DisplayName("saveAuditLog")
    class SaveAuditLog {

        @Test
        @DisplayName("persists audit log via repository")
        void saveAuditLog_CallsRepository() {
            auditService.saveAuditLog(sampleLog);
            verify(auditRepository).save(sampleLog);
        }
    }

    @Nested
    @DisplayName("getAllLogs")
    class GetAllLogs {

        @Test
        @DisplayName("returns mapped list of all audit logs")
        void getAllLogs_ReturnsMappedList() {
            when(auditRepository.findAll()).thenReturn(List.of(sampleLog));
            when(auditMapper.toAuditLogResponse(sampleLog)).thenReturn(sampleResponse);

            List<AuditLogResponse> result = auditService.getAllLogs();

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getAction()).isEqualTo(AuditAction.LOGIN);
            verify(auditRepository).findAll();
        }

        @Test
        @DisplayName("returns empty list when no logs exist")
        void getAllLogs_Empty_ReturnsEmptyList() {
            when(auditRepository.findAll()).thenReturn(List.of());

            List<AuditLogResponse> result = auditService.getAllLogs();

            assertThat(result).isEmpty();
        }
    }

    @Nested
    @DisplayName("getLogsByUser")
    class GetLogsByUser {

        @Test
        @DisplayName("returns logs for specified user")
        void getLogsByUser_ReturnsUserLogs() {
            when(auditRepository.findByUserIdOrderByCreatedAtDesc(userId)).thenReturn(List.of(sampleLog));
            when(auditMapper.toAuditLogResponse(sampleLog)).thenReturn(sampleResponse);

            List<AuditLogResponse> result = auditService.getLogsByUser(userId);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getUserId()).isEqualTo(userId);
        }

        @Test
        @DisplayName("returns empty list when user has no logs")
        void getLogsByUser_NoLogs_ReturnsEmpty() {
            when(auditRepository.findByUserIdOrderByCreatedAtDesc(userId)).thenReturn(List.of());

            List<AuditLogResponse> result = auditService.getLogsByUser(userId);

            assertThat(result).isEmpty();
        }
    }

    @Nested
    @DisplayName("getLogsByEntity")
    class GetLogsByEntity {

        @Test
        @DisplayName("returns logs matching entity type and id")
        void getLogsByEntity_ReturnsMatchingLogs() {
            when(auditRepository.findByEntityTypeAndEntityId("User", userId.toString()))
                    .thenReturn(List.of(sampleLog));
            when(auditMapper.toAuditLogResponse(sampleLog)).thenReturn(sampleResponse);

            List<AuditLogResponse> result = auditService.getLogsByEntity("User", userId.toString());

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getEntityType()).isEqualTo("User");
        }
    }
}
