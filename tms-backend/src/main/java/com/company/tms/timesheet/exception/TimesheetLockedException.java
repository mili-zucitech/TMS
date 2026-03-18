package com.company.tms.timesheet.exception;

public class TimesheetLockedException extends RuntimeException {

    public TimesheetLockedException(String message) {
        super(message);
    }
}
