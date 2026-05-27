package com.tourservice.dto;

public class StartTourRequest {
    private Long tourId;
    private Double latitude;
    private Double longitude;

    public Long getTourId()        { return tourId; }
    public void setTourId(Long v)  { this.tourId = v; }

    public Double getLatitude()         { return latitude; }
    public void setLatitude(Double v)   { this.latitude = v; }

    public Double getLongitude()        { return longitude; }
    public void setLongitude(Double v)  { this.longitude = v; }
}
