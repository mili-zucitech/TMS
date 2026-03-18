package com.company.tms.leave.service;

import com.company.tms.exception.ResourceNotFoundException;
import com.company.tms.leave.dto.LeaveTypeResponse;
import com.company.tms.leave.mapper.LeaveMapper;
import com.company.tms.leave.repository.LeaveTypeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LeaveTypeService {

    private final LeaveTypeRepository leaveTypeRepository;
    private final LeaveMapper leaveMapper;

    public List<LeaveTypeResponse> getAllLeaveTypes() {
        log.debug("Fetching all leave types");
        return leaveTypeRepository.findAll().stream()
                .map(leaveMapper::toLeaveTypeResponse)
                .collect(Collectors.toList());
    }

    public LeaveTypeResponse getLeaveTypeById(Long id) {
        return leaveMapper.toLeaveTypeResponse(
                leaveTypeRepository.findById(id)
                        .orElseThrow(() -> new ResourceNotFoundException("LeaveType", "id", id)));
    }
}
