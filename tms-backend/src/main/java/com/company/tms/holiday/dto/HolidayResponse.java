package com.company.tms.holiday.dto;

import com.company.tms.holiday.entity.HolidayType;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HolidayResponse {

    private Long id;
    private String name;
    private String description;
    private LocalDate holidayDate;
    private HolidayType type;
    private Boolean isOptional;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
