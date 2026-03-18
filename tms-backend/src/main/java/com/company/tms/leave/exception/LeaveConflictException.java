package com.company.tms.leave.exception;

public class LeaveConflictException extends RuntimeException {

    public LeaveConflictException(String message) {
        super(message);
    }
}
