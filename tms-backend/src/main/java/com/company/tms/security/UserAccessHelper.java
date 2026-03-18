package com.company.tms.security;

import com.company.tms.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Spring Security helper bean used in {@code @PreAuthorize} SpEL expressions.
 *
 * <pre>
 * {@literal @}PreAuthorize("hasRole('ADMIN') or @userAccessHelper.isSelf(#userId)")
 * </pre>
 */
@Component("userAccessHelper")
@RequiredArgsConstructor
public class UserAccessHelper {

    private final UserRepository userRepository;

    /**
     * Returns {@code true} if the currently authenticated principal owns the given userId.
     */
    public boolean isSelf(UUID userId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return false;
        }
        return userRepository.findByEmail(auth.getName())
                .map(u -> u.getId().equals(userId))
                .orElse(false);
    }
}
