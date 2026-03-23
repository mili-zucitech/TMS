package com.company.tms.exception;

import com.company.tms.holiday.exception.HolidayConflictException;
import com.company.tms.leave.exception.InsufficientLeaveBalanceException;
import com.company.tms.leave.exception.LeaveConflictException;
import com.company.tms.leave.exception.LeaveOverlapException;
import com.company.tms.timesheet.exception.InvalidTimesheetStateException;
import com.company.tms.timesheet.exception.TimeOverlapException;
import com.company.tms.timesheet.exception.TimesheetLockedException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Tests for GlobalExceptionHandler. Uses standalone MockMvc to directly register
 * GlobalExceptionHandler as ControllerAdvice, bypassing Spring Security filters.
 */
@DisplayName("GlobalExceptionHandler Tests")
class GlobalExceptionHandlerTest {

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();
        mockMvc = MockMvcBuilders
                .standaloneSetup(new TestExceptionController())
                .setControllerAdvice(new GlobalExceptionHandler())
                .setValidator(validator)
                .build();
    }

    /**
     * Minimal controller that throws controlled exceptions for testing purposes.
     */
    @RestController
    @RequestMapping("/test/exceptions")
    static class TestExceptionController {

        @GetMapping("/not-found")
        public void notFound() {
            throw new ResourceNotFoundException("Entity", "id", UUID.randomUUID());
        }

        @GetMapping("/validation")
        public void validation() {
            throw new ValidationException("Field value is invalid");
        }

        @GetMapping("/forbidden")
        public void forbidden() {
            throw new ForbiddenException("You are not allowed to access this resource");
        }

        @GetMapping("/unauthorized")
        public void unauthorized() {
            throw new UnauthorizedException("JWT token is missing or invalid");
        }

        @GetMapping("/access-denied")
        public void accessDenied() {
            throw new AccessDeniedException("Access is denied");
        }

        @GetMapping("/bad-credentials")
        public void badCredentials() {
            throw new BadCredentialsException("Invalid username or password");
        }

        @GetMapping("/leave-overlap")
        public void leaveOverlap() {
            throw new LeaveOverlapException("Leave dates overlap with existing approved leave");
        }

        @GetMapping("/insufficient-balance")
        public void insufficientBalance() {
            throw new InsufficientLeaveBalanceException("Insufficient balance. Requested: 10, Available: 3");
        }

        @GetMapping("/leave-conflict")
        public void leaveConflict() {
            throw new LeaveConflictException("User is on approved leave on this date");
        }

        @GetMapping("/holiday-conflict")
        public void holidayConflict() {
            throw new HolidayConflictException("A holiday already exists on this date");
        }

        @GetMapping("/time-overlap")
        public void timeOverlap() {
            throw new TimeOverlapException("Time overlap detected between 09:00 and 12:00");
        }

        @GetMapping("/timesheet-locked")
        public void timesheetLocked() {
            throw new TimesheetLockedException("Timesheet 1 cannot be modified in LOCKED state");
        }

        @GetMapping("/invalid-state")
        public void invalidState() {
            throw new InvalidTimesheetStateException("Timesheet can only be approved from SUBMITTED state");
        }

        @GetMapping("/illegal-argument")
        public void illegalArgument() {
            throw new IllegalArgumentException("Argument value 'xyz' is not valid");
        }

        @GetMapping("/generic-error")
        public void genericError() {
            throw new RuntimeException("Unexpected database connection error");
        }

        @PostMapping("/validation-bean")
        public void beanValidation(@RequestBody @jakarta.validation.Valid TestDto dto) {
        }

        record TestDto(
                @jakarta.validation.constraints.NotBlank(message = "name is required") String name,
                @jakarta.validation.constraints.Email(message = "must be valid email") String email
        ) {}
    }

    @Test
    @DisplayName("ResourceNotFoundException returns 404 RESOURCE_NOT_FOUND")
    void handleResourceNotFound_Returns404() throws Exception {
        mockMvc.perform(get("/test/exceptions/not-found"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("RESOURCE_NOT_FOUND"))
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    @DisplayName("ValidationException returns 400 VALIDATION_ERROR")
    void handleValidationException_Returns400() throws Exception {
        mockMvc.perform(get("/test/exceptions/validation"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.message").value("Field value is invalid"));
    }

    @Test
    @DisplayName("ForbiddenException returns 403 FORBIDDEN")
    void handleForbiddenException_Returns403() throws Exception {
        mockMvc.perform(get("/test/exceptions/forbidden"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
    }

    @Test
    @DisplayName("UnauthorizedException returns 401 UNAUTHORIZED")
    void handleUnauthorizedException_Returns401() throws Exception {
        mockMvc.perform(get("/test/exceptions/unauthorized"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("UNAUTHORIZED"));
    }

    @Test
    @DisplayName("AccessDeniedException returns 403 ACCESS_DENIED")
    void handleAccessDeniedException_Returns403() throws Exception {
        mockMvc.perform(get("/test/exceptions/access-denied"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"))
                .andExpect(jsonPath("$.message").value("You do not have permission to perform this action"));
    }

    @Test
    @DisplayName("BadCredentialsException returns 401 INVALID_CREDENTIALS")
    void handleBadCredentialsException_Returns401() throws Exception {
        mockMvc.perform(get("/test/exceptions/bad-credentials"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("INVALID_CREDENTIALS"))
                .andExpect(jsonPath("$.message").value("Invalid email or password"));
    }

    @Test
    @DisplayName("LeaveOverlapException returns 409 LEAVE_OVERLAP")
    void handleLeaveOverlapException_Returns409() throws Exception {
        mockMvc.perform(get("/test/exceptions/leave-overlap"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value("LEAVE_OVERLAP"));
    }

    @Test
    @DisplayName("InsufficientLeaveBalanceException returns 422 INSUFFICIENT_LEAVE_BALANCE")
    void handleInsufficientLeaveBalanceException_Returns422() throws Exception {
        mockMvc.perform(get("/test/exceptions/insufficient-balance"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.errorCode").value("INSUFFICIENT_LEAVE_BALANCE"));
    }

    @Test
    @DisplayName("TimeOverlapException returns 409 TIME_OVERLAP")
    void handleTimeOverlapException_Returns409() throws Exception {
        mockMvc.perform(get("/test/exceptions/time-overlap"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value("TIME_OVERLAP"));
    }

    @Test
    @DisplayName("TimesheetLockedException returns 422 TIMESHEET_LOCKED")
    void handleTimesheetLockedException_Returns422() throws Exception {
        mockMvc.perform(get("/test/exceptions/timesheet-locked"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.errorCode").value("TIMESHEET_LOCKED"));
    }

    @Test
    @DisplayName("InvalidTimesheetStateException returns 422 INVALID_TIMESHEET_STATE")
    void handleInvalidTimesheetStateException_Returns422() throws Exception {
        mockMvc.perform(get("/test/exceptions/invalid-state"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.errorCode").value("INVALID_TIMESHEET_STATE"));
    }

    @Test
    @DisplayName("IllegalArgumentException returns 400 INVALID_ARGUMENT")
    void handleIllegalArgumentException_Returns400() throws Exception {
        mockMvc.perform(get("/test/exceptions/illegal-argument"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("INVALID_ARGUMENT"));
    }

    @Test
    @DisplayName("Generic Exception returns 500 INTERNAL_SERVER_ERROR")
    void handleGenericException_Returns500() throws Exception {
        mockMvc.perform(get("/test/exceptions/generic-error"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.errorCode").value("INTERNAL_SERVER_ERROR"))
                .andExpect(jsonPath("$.message").value("An unexpected error occurred. Please try again later."));
    }

    @Test
    @DisplayName("Bean validation failure returns 400 VALIDATION_FAILED with field details")
    void handleMethodArgumentNotValid_Returns400WithFieldErrors() throws Exception {
        String invalidBody = """
                {
                  "name": "",
                  "email": "invalid-email"
                }
                """;

        mockMvc.perform(post("/test/exceptions/validation-bean")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidBody))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.message").isString());
    }
}
