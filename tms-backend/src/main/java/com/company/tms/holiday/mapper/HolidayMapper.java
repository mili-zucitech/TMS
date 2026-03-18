package com.company.tms.holiday.mapper;

import com.company.tms.holiday.dto.HolidayCreateRequest;
import com.company.tms.holiday.dto.HolidayResponse;
import com.company.tms.holiday.dto.HolidayUpdateRequest;
import com.company.tms.holiday.entity.Holiday;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(
        componentModel = "spring",
        nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE
)
public interface HolidayMapper {

    HolidayResponse toHolidayResponse(Holiday holiday);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    Holiday toHolidayEntity(HolidayCreateRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateHolidayEntity(HolidayUpdateRequest request, @MappingTarget Holiday holiday);
}
