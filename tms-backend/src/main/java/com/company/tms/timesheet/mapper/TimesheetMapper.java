package com.company.tms.timesheet.mapper;

import com.company.tms.timesheet.dto.TimeEntryCreateRequest;
import com.company.tms.timesheet.dto.TimeEntryResponse;
import com.company.tms.timesheet.dto.TimeEntryUpdateRequest;
import com.company.tms.timesheet.dto.TimesheetCreateRequest;
import com.company.tms.timesheet.dto.TimesheetResponse;
import com.company.tms.timesheet.entity.TimeEntry;
import com.company.tms.timesheet.entity.Timesheet;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(
        componentModel = "spring",
        nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE
)
public interface TimesheetMapper {

    // -------------------------------------------------------------------------
    // Timesheet mappings
    // -------------------------------------------------------------------------

    TimesheetResponse toTimesheetResponse(Timesheet timesheet);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "submittedAt", ignore = true)
    @Mapping(target = "approvedAt", ignore = true)
    @Mapping(target = "approvedBy", ignore = true)
    @Mapping(target = "rejectionReason", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    Timesheet toTimesheetEntity(TimesheetCreateRequest request);

    // -------------------------------------------------------------------------
    // TimeEntry mappings
    // -------------------------------------------------------------------------

    TimeEntryResponse toTimeEntryResponse(TimeEntry entry);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "durationMinutes", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    TimeEntry toTimeEntryEntity(TimeEntryCreateRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "timesheetId", ignore = true)
    @Mapping(target = "userId", ignore = true)
    @Mapping(target = "durationMinutes", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateTimeEntryEntity(TimeEntryUpdateRequest request, @MappingTarget TimeEntry entry);
}

