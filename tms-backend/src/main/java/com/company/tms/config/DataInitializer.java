package com.company.tms.config;

import com.company.tms.user.entity.Role;
import com.company.tms.user.entity.RoleName;
import com.company.tms.user.entity.User;
import com.company.tms.user.entity.UserStatus;
import com.company.tms.user.repository.RoleRepository;
import com.company.tms.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Arrays;

/**
 * Seeds essential reference data (roles, default admin user) on first startup.
 * All inserts are idempotent — re-running the application never duplicates
 * data.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements ApplicationRunner {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        seedRoles();
        seedDefaultUsers();
    }

    // -------------------------------------------------------------------------
    // Roles
    // -------------------------------------------------------------------------

    private void seedRoles() {
        Arrays.stream(RoleName.values()).forEach(roleName -> {
            if (roleRepository.findByName(roleName).isEmpty()) {
                roleRepository.save(Role.builder().name(roleName).build());
                log.info("Seeded role: {}", roleName);
            }
        });
    }

    // -------------------------------------------------------------------------
    // Default users — one per role
    // -------------------------------------------------------------------------

    private record SeedUser(String employeeId, String name, String email,
            String password, String designation, RoleName role) {
    }

    private void seedDefaultUsers() {
        java.util.List<SeedUser> defaults = java.util.List.of(
                new SeedUser("EMP-0001", "System Admin",    "admin@tms.com",    "Admin@123",    "System Administrator", RoleName.ADMIN)
                
        );

        defaults.forEach(seed -> {
            if (userRepository.findByEmail(seed.email()).isPresent()) {
                return; // already seeded
            }

            Role role = roleRepository.findByName(seed.role())
                    .orElseThrow(() -> new IllegalStateException(seed.role() + " role not found after seeding"));

            userRepository.save(User.builder()
                    .employeeId(seed.employeeId())
                    .name(seed.name())
                    .email(seed.email())
                    .passwordHash(passwordEncoder.encode(seed.password()))
                    .designation(seed.designation())
                    .joiningDate(LocalDate.now())
                    .status(UserStatus.ACTIVE)
                    .role(role)
                    .build());

            log.info("Seeded user: {} / {} [{}]", seed.email(), seed.password(), seed.role());
        });

        log.info("========================================================");
        log.info("  Default users:");
        log.info("  admin@tms.com    / Admin@123    [ADMIN]");
        log.info("  CHANGE THESE PASSWORDS BEFORE GOING TO PRODUCTION!");
        log.info("========================================================");
    }
}
