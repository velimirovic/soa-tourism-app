package com.tourservice.dto;

import com.tourservice.model.TourDuration;

public class TourDurationResponse {

    private Long id;
    private Long tourId;
    private String transportType;
    private Integer durationInMinutes;

    public static TourDurationResponse from(TourDuration td) {
        TourDurationResponse r = new TourDurationResponse();
        r.id                 = td.getId();
        r.tourId             = td.getTourId();
        r.transportType      = td.getTransportType();
        r.durationInMinutes  = td.getDurationInMinutes();
        return r;
    }

    public Long getId()                   { return id; }
    public Long getTourId()               { return tourId; }
    public String getTransportType()      { return transportType; }
    public Integer getDurationInMinutes() { return durationInMinutes; }
}
