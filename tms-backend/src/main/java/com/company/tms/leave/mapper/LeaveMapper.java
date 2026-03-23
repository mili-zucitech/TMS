package com.company.tms.leave.mapper;

import com.company.tms.leave.dto.LeaveBalanceResponse;
import com.company.tms.leave.dto.LeaveRequestCreateRequest;
import com.company.tms.leave.dto.LeaveRequestResponse;
import com.company.tms.leave.dto.LeaveTypeResponse;
import com.company.tms.leave.entity.Leave;
import com.company.tms.leave.entity.LeaveBalance;
import com.company.tms.leave.entity.LeaveType;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(
        componentModel = "spring",
        nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE
)
public interface LeaveMapper {

    // -------------------------------------------------------------------------
    // LeaveType
    // -------------------------------------------------------------------------

    LeaveTypeResponse toLeaveTypeResponse(LeaveType leaveType);

    // -------------------------------------------------------------------------
    // Leave (LeaveRequest)
    // -------------------------------------------------------------------------

    @Mapping(target = "leaveTypeName", ignore = true)
    @Mapping(target = "employeeName", ignore = true)
    LeaveRequestResponse toLeaveRequestResponse(Leave leave);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "totalDays", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "appliedAt", ignore = true)
    @Mapping(target = "approvedAt", ignore = true) 
    @Mapping(target = "approvedBy", ignore = true)
    @Mapping(target = "rejectionReason", ignore = true)
    Leave toLeaveEntity(LeaveRequestCreateRequest request);

    // -------------------------------------------------------------------------
    // LeaveBalance
    // -------------------------------------------------------------------------

    @Mapping(target = "leaveTypeName", ignore = true)
    LeaveBalanceResponse toLeaveBalanceResponse(LeaveBalance leaveBalance);
}

