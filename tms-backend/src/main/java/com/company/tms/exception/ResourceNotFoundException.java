package com.company.tms.exception;

import org.springframework.lang.NonNull;

public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(@NonNull String message) {
        super(message);
    }

    public ResourceNotFoundException(@NonNull String resourceName, @NonNull String fieldName, @NonNull Object fieldValue) {
        super(String.format("%s not found with %s: '%s'", resourceName, fieldName, fieldValue));
    }
}
