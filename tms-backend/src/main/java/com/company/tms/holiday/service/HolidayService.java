package com.company.tms.holiday.service;

import com.company.tms.exception.ResourceNotFoundException;
import com.company.tms.holiday.dto.HolidayCreateRequest;
import com.company.tms.holiday.dto.HolidayResponse;
import com.company.tms.holiday.dto.HolidayUpdateRequest;
import com.company.tms.holiday.entity.Holiday;
import com.company.tms.holiday.mapper.HolidayMapper;
import com.company.tms.holiday.repository.HolidayRepository;
import com.company.tms.holiday.validator.HolidayValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class HolidayService {

    private final HolidayRepository holidayRepository;
    private final HolidayMapper holidayMapper;
    private final HolidayValidator holidayValidator;

    // -------------------------------------------------------------------------
    // Create
    // -------------------------------------------------------------------------

    @Transactional
    public HolidayResponse createHoliday(HolidayCreateRequest request) {
        log.info("Creating holiday on date: {}", request.getHolidayDate());
        holidayValidator.validateDateUniqueness(request.getHolidayDate());
        Holiday holiday = holidayMapper.toHolidayEntity(request);
        Holiday saved = holidayRepository.save(holiday);
        return holidayMapper.toHolidayResponse(saved);
    }

    // -------------------------------------------------------------------------
    // Update
    // -------------------------------------------------------------------------

    @Transactional
    public HolidayResponse updateHoliday(Long id, HolidayUpdateRequest request) {
        log.info("Updating holiday id: {}", id);
        Holiday holiday = findHolidayById(id);
        if (request.getHolidayDate() != null) {
            holidayValidator.validateDateUniquenessForUpdate(request.getHolidayDate(), id);
        }
        holidayMapper.updateHolidayEntity(request, holiday);
        Holiday saved = holidayRepository.save(holiday);
        return holidayMapper.toHolidayResponse(saved);
    }

    // -------------------------------------------------------------------------
    // Delete
    // -------------------------------------------------------------------------

    @Transactional
    public void deleteHoliday(Long id) {
        log.info("Deleting holiday id: {}", id);
        Holiday holiday = findHolidayById(id);
        holidayRepository.delete(holiday);
    }

    // -------------------------------------------------------------------------
    // Read
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public HolidayResponse getHolidayById(Long id) {
        return holidayMapper.toHolidayResponse(findHolidayById(id));
    }

    @Transactional(readOnly = true)
    public List<HolidayResponse> getAllHolidays() {
        return holidayRepository.findAll()
                .stream()
                .map(holidayMapper::toHolidayResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<HolidayResponse> getHolidaysBetweenDates(LocalDate startDate, LocalDate endDate) {
        return holidayRepository.findByHolidayDateBetween(startDate, endDate)
                .stream()
                .map(holidayMapper::toHolidayResponse)
                .collect(Collectors.toList());
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    private Holiday findHolidayById(Long id) {
        return holidayRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Holiday not found with id: " + id));
    }
}
