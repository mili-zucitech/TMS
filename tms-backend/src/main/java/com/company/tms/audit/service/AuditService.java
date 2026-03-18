package com.company.tms.audit.service;

import com.company.tms.audit.dto.AuditLogResponse;
import com.company.tms.audit.entity.AuditLog;
import com.company.tms.audit.mapper.AuditMapper;
import com.company.tms.audit.repository.AuditRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditRepository auditRepository;
    private final AuditMapper auditMapper;

    // -------------------------------------------------------------------------
    // Write
    // -------------------------------------------------------------------------

    @Transactional
    public void saveAuditLog(AuditLog auditLog) {
        log.debug("Saving audit log: action={}, entity={}/{}",
                auditLog.getAction(), auditLog.getEntityType(), auditLog.getEntityId());
        auditRepository.save(auditLog);
    }

    // -------------------------------------------------------------------------
    // Read
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<AuditLogResponse> getAllLogs() {
        return auditRepository.findAll()
                .stream()
                .map(auditMapper::toAuditLogResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AuditLogResponse> getLogsByUser(UUID userId) {
        return auditRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(auditMapper::toAuditLogResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AuditLogResponse> getLogsByEntity(String entityType, String entityId) {
        return auditRepository.findByEntityTypeAndEntityId(entityType, entityId)
                .stream()
                .map(auditMapper::toAuditLogResponse)
                .collect(Collectors.toList());
    }
}
