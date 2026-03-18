package com.company.tms.auth.dto;

public record LoginResponse(
        String accessToken,
        String tokenType
) {
    public LoginResponse(String accessToken) {
        this(accessToken, "Bearer");
    }
}
