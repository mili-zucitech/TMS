package com.company.tms.holiday.dto;

import com.company.tms.holiday.entity.HolidayType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HolidayCreateRequest {

    @NotBlank(message = "Holiday name is required")
    private String name;

    private String description;

    @NotNull(message = "Holiday date is required")
    private LocalDate holidayDate;

    private HolidayType type;

    private Boolean isOptional;
}
