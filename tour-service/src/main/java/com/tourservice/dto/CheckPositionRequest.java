package com.tourservice.dto;

public class CheckPositionRequest {
    private Double latitude;
    private Double longitude;

    public Double getLatitude()        { return latitude; }
    public void setLatitude(Double v)  { this.latitude = v; }

    public Double getLongitude()       { return longitude; }
    public void setLongitude(Double v) { this.longitude = v; }
}
