package com.company.tms.timesheet.dto;

import lombok.*;

/** Optional request body for the submit endpoint. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TimesheetSubmitRequest {

    /** Reason provided by the employee when the week contains overtime (> 8h in any day). */
    private String overtimeReason;
}
