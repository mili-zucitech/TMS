package com.company.tms.holiday.controller;

import com.company.tms.util.ApiResponse;
import com.company.tms.holiday.dto.HolidayCreateRequest;
import com.company.tms.holiday.dto.HolidayResponse;
import com.company.tms.holiday.dto.HolidayUpdateRequest;
import com.company.tms.holiday.service.HolidayService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/holidays")
@RequiredArgsConstructor
public class HolidayController {

    private final HolidayService holidayService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<HolidayResponse>>> getAllHolidays() {
        List<HolidayResponse> holidays = holidayService.getAllHolidays();
        return ResponseEntity.ok(ApiResponse.success(holidays));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<HolidayResponse>> getHolidayById(@PathVariable Long id) {
        HolidayResponse holiday = holidayService.getHolidayById(id);
        return ResponseEntity.ok(ApiResponse.success(holiday));
    }

    @GetMapping("/range")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<HolidayResponse>>> getHolidaysBetweenDates(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        List<HolidayResponse> holidays = holidayService.getHolidaysBetweenDates(startDate, endDate);
        return ResponseEntity.ok(ApiResponse.success(holidays));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<HolidayResponse>> createHoliday(
            @Valid @RequestBody HolidayCreateRequest request) {
        HolidayResponse created = holidayService.createHoliday(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(created));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<HolidayResponse>> updateHoliday(
            @PathVariable Long id,
            @Valid @RequestBody HolidayUpdateRequest request) {
        HolidayResponse updated = holidayService.updateHoliday(id, request);
        return ResponseEntity.ok(ApiResponse.success(updated));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteHoliday(@PathVariable Long id) {
        holidayService.deleteHoliday(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
