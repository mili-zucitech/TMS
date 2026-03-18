package com.company.tms.audit.mapper;

import com.company.tms.audit.dto.AuditLogResponse;
import com.company.tms.audit.entity.AuditLog;
import org.mapstruct.Mapper;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(
        componentModel = "spring",
        nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE
)
public interface AuditMapper {

    AuditLogResponse toAuditLogResponse(AuditLog auditLog);
}
