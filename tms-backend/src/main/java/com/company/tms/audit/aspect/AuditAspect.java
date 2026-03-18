package com.company.tms.audit.aspect;

import com.company.tms.audit.annotation.Audit;
import com.company.tms.audit.entity.AuditLog;
import com.company.tms.audit.service.AuditService;
import com.company.tms.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.UUID;

/**
 * Spring AOP aspect that intercepts methods annotated with {@link Audit} and
 * persists an {@link AuditLog} record after the method completes successfully.
 *
 * <p>The aspect is non-invasive: if audit logging itself fails the original
 * method result is still returned (the failure is only logged as a warning).</p>
 */
@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class AuditAspect {

    private final AuditService auditService;
    private final UserRepository userRepository;

    @Around("@annotation(auditAnnotation)")
    public Object auditMethod(ProceedingJoinPoint pjp, Audit auditAnnotation) throws Throwable {
        // Always proceed first — only log on success
        Object result = pjp.proceed();

        try {
            AuditLog auditLog = AuditLog.builder()
                    .userId(resolveCurrentUserId())
                    .action(auditAnnotation.action())
                    .entityType(auditAnnotation.entityType())
                    .entityId(resolveEntityId(pjp.getArgs()))
                    .description(auditAnnotation.description())
                    .ipAddress(resolveIpAddress())
                    .build();

            auditService.saveAuditLog(auditLog);
        } catch (Exception e) {
            log.warn("Failed to persist audit log for action={} entity={}: {}",
                    auditAnnotation.action(), auditAnnotation.entityType(), e.getMessage());
        }

        return result;
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Resolves the UUID of the currently authenticated user by looking up
     * the email stored in the Spring Security context.
     */
    private UUID resolveCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()
                || "anonymousUser".equals(auth.getPrincipal())) {
            return null;
        }
        return userRepository.findByEmail(auth.getName())
                .map(u -> u.getId())
                .orElse(null);
    }

    /**
     * Extracts the first {@link Long} or {@link UUID} argument as the entity ID string.
     * Returns {@code null} if no such argument exists.
     */
    private String resolveEntityId(Object[] args) {
        if (args == null) {
            return null;
        }
        for (Object arg : args) {
            if (arg instanceof Long || arg instanceof UUID) {
                return arg.toString();
            }
        }
        return null;
    }

    /**
     * Retrieves the remote IP address from the current HTTP request, if available.
     * Returns {@code null} for non-HTTP invocation contexts (e.g. scheduled tasks).
     */
    private String resolveIpAddress() {
        try {
            ServletRequestAttributes attrs =
                    (ServletRequestAttributes) RequestContextHolder.currentRequestAttributes();
            return attrs.getRequest().getRemoteAddr();
        } catch (Exception e) {
            return null;
        }
    }
}
