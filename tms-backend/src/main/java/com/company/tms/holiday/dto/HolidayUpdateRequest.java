package com.company.tms.holiday.dto;

import com.company.tms.holiday.entity.HolidayType;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HolidayUpdateRequest {

    private String name;
    private String description;
    private LocalDate holidayDate;
    private HolidayType type;
    private Boolean isOptional;
}
