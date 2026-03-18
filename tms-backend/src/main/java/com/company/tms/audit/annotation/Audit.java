package com.company.tms.audit.annotation;

import com.company.tms.audit.entity.AuditAction;

import java.lang.annotation.*;

/**
 * Marks a service method for automatic audit logging via {@link com.company.tms.audit.aspect.AuditAspect}.
 *
 * <pre>
 * {@literal @}Audit(action = AuditAction.CREATE, entityType = "PROJECT", description = "Project created")
 * public ProjectResponse createProject(ProjectCreateRequest request) { ... }
 * </pre>
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface Audit {

    /** The type of action being performed. */
    AuditAction action();

    /** The logical name of the entity being acted upon (e.g. "PROJECT", "TIMESHEET"). */
    String entityType();

    /** Human-readable description of the action (optional). */
    String description() default "";
}
