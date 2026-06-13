package com.company.tms.config;

import com.company.tms.leave.repository.LeaveRepository;
import com.company.tms.leave.service.LeaveAccessEvaluator;
import com.company.tms.security.SecurityConfig;
import com.company.tms.timesheet.repository.TimesheetRepository;
import com.company.tms.timesheet.service.TimesheetAccessEvaluator;
import com.company.tms.user.repository.UserRepository;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;

import static org.mockito.Mockito.mock;

/**
 * Shared security + CORS wiring for {@code @WebMvcTest} classes that import {@link SecurityConfig}.
 */
@TestConfiguration
@EnableConfigurationProperties(CorsProperties.class)
@Import({
        SecurityConfig.class,
        CorsConfig.class,
        LeaveAccessEvaluator.class,
        TimesheetAccessEvaluator.class
})
public class WebMvcSecurityTestConfig {

    @Bean
    LeaveRepository leaveRepository() {
        return mock(LeaveRepository.class);
    }

    @Bean
    UserRepository userRepository() {
        return mock(UserRepository.class);
    }

    @Bean
    TimesheetRepository timesheetRepository() {
        return mock(TimesheetRepository.class);
    }
}
