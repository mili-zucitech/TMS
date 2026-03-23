package com.company.tms.security;

import io.jsonwebtoken.ExpiredJwtException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;

@DisplayName("JwtService Unit Tests")
class JwtServiceTest {

    private JwtService jwtService;

    // Valid Base64-encoded 256-bit secret for HMAC-SHA256
    private static final String TEST_SECRET =
            "dG1zLWp3dC1zZWNyZXQta2V5LXZlcnktc2VjdXJlLW1pbi0zMi1jaGFycw==";
    // 24 hours
    private static final long VALID_EXPIRATION = 86_400_000L;
    // 1 millisecond (for expired-token tests)
    private static final long EXPIRED_EXPIRATION = 1L;

    private UserDetails userDetails;
    private UUID userId;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        ReflectionTestUtils.setField(jwtService, "secretKey", TEST_SECRET);
        ReflectionTestUtils.setField(jwtService, "expiration", VALID_EXPIRATION);

        userId = UUID.randomUUID();
        userDetails = User.withUsername("john.doe@company.com")
                .password("password")
                .authorities("ROLE_EMPLOYEE")
                .build();
    }

    @Nested
    @DisplayName("GenerateToken")
    class GenerateToken {

        @Test
        @DisplayName("generateToken returns non-null JWT string")
        void generateToken_ReturnsNonNullJwt() {
            String token = jwtService.generateToken(userDetails);

            assertThat(token).isNotNull().isNotBlank();
            assertThat(token.split("\\.")).hasSize(3); // header.payload.signature
        }

        @Test
        @DisplayName("generateToken with userId includes userId claim")
        void generateToken_WithUserId_IncludesUserIdClaim() {
            String token = jwtService.generateToken(userDetails, userId);

            String extractedUserId = jwtService.extractClaim(token,
                    claims -> claims.get("userId", String.class));

            assertThat(extractedUserId).isEqualTo(userId.toString());
        }
    }

    @Nested
    @DisplayName("ExtractUsername")
    class ExtractUsername {

        @Test
        @DisplayName("extractUsername returns the email from token subject")
        void extractUsername_ReturnsEmail() {
            String token = jwtService.generateToken(userDetails);

            String username = jwtService.extractUsername(token);

            assertThat(username).isEqualTo("john.doe@company.com");
        }
    }

    @Nested
    @DisplayName("IsTokenValid")
    class IsTokenValid {

        @Test
        @DisplayName("valid token for correct user returns true")
        void isTokenValid_ValidToken_ReturnsTrue() {
            String token = jwtService.generateToken(userDetails);

            boolean valid = jwtService.isTokenValid(token, userDetails);

            assertThat(valid).isTrue();
        }

        @Test
        @DisplayName("token issued for different user returns false")
        void isTokenValid_WrongUser_ReturnsFalse() {
            String token = jwtService.generateToken(userDetails);

            UserDetails otherUser = User.withUsername("other@company.com")
                    .password("password")
                    .authorities("ROLE_EMPLOYEE")
                    .build();

            boolean valid = jwtService.isTokenValid(token, otherUser);

            assertThat(valid).isFalse();
        }

        @Test
        @DisplayName("expired token throws ExpiredJwtException")
        void isTokenValid_ExpiredToken_ThrowsException() throws InterruptedException {
            JwtService shortLivedService = new JwtService();
            ReflectionTestUtils.setField(shortLivedService, "secretKey", TEST_SECRET);
            ReflectionTestUtils.setField(shortLivedService, "expiration", EXPIRED_EXPIRATION);

            String expiredToken = shortLivedService.generateToken(userDetails);
            Thread.sleep(10); // ensure token expires

            assertThatThrownBy(() -> shortLivedService.isTokenValid(expiredToken, userDetails))
                    .isInstanceOf(ExpiredJwtException.class);
        }

        @Test
        @DisplayName("token includes role claims")
        void generateToken_IncludeRoleClaims() {
            String token = jwtService.generateToken(userDetails);

            @SuppressWarnings("unchecked")
            List<String> roles = (List<String>) jwtService.extractClaim(token,
                    claims -> claims.get("roles", List.class));

            assertThat(roles).isNotNull();
            assertThat(roles.get(0)).isEqualTo("ROLE_EMPLOYEE");
        }
    }
}
