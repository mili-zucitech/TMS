package com.company.tms.user.validator;

import com.company.tms.exception.ValidationException;
import com.company.tms.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class UserValidator {

    private final UserRepository userRepository;

    /**
     * Validates that no other user already owns this email address.
     * Used during user creation.
     */
    public void validateEmailUniqueness(String email) {
        log.debug("Validating email uniqueness for: {}", email);
        if (userRepository.existsByEmail(email)) {
            throw new ValidationException("Email address is already in use: " + email);
        }
    }

    /**
     * Validates that no other user already owns this email address, excluding a given user.
     * Used during user updates.
     */
    public void validateEmailUniquenessForUpdate(String email, UUID excludeUserId) {
        log.debug("Validating email uniqueness for update, email: {}, excludeId: {}", email, excludeUserId);
        if (userRepository.existsByEmailAndIdNot(email, excludeUserId)) {
            throw new ValidationException("Email address is already in use: " + email);
        }
    }

    /**
     * Validates that no other user already has this employee ID.
     * Used during user creation.
     */
    public void validateEmployeeIdUniqueness(String employeeId) {
        log.debug("Validating employeeId uniqueness for: {}", employeeId);
        if (userRepository.existsByEmployeeId(employeeId)) {
            throw new ValidationException("Employee ID is already in use: " + employeeId);
        }
    }

    /**
     * Validates that no other user already has this employee ID, excluding a given user.
     * Used during user updates.
     */
    public void validateEmployeeIdUniquenessForUpdate(String employeeId, UUID excludeUserId) {
        log.debug("Validating employeeId uniqueness for update, employeeId: {}, excludeId: {}", employeeId, excludeUserId);
        if (userRepository.existsByEmployeeIdAndIdNot(employeeId, excludeUserId)) {
            throw new ValidationException("Employee ID is already in use: " + employeeId);
        }
    }
}

