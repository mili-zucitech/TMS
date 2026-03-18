package com.company.tms.timesheet.exception;

public class TimeOverlapException extends RuntimeException {

    public TimeOverlapException(String message) {
        super(message);
    }
}
