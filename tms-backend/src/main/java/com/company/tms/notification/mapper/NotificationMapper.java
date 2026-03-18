package com.company.tms.notification.mapper;

import com.company.tms.notification.dto.NotificationResponse;
import com.company.tms.notification.entity.Notification;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(
        componentModel = "spring",
        nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE
)
public interface NotificationMapper {

    // Lombok generates isRead() getter, which MapStruct treats as property "read".
    // The @Builder target method is "isRead", so the mapping must be explicit.
    @Mapping(source = "read", target = "isRead")
    NotificationResponse toNotificationResponse(Notification notification);
}
