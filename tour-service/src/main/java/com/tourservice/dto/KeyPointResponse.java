package com.tourservice.dto;

import com.tourservice.model.KeyPoint;

public class KeyPointResponse {

    private Long id;
    private Long tourId;
    private String name;
    private String description;
    private String imageUrl;
    private Double latitude;
    private Double longitude;

    public static KeyPointResponse from(KeyPoint kp) {
        KeyPointResponse r = new KeyPointResponse();
        r.id          = kp.getId();
        r.tourId      = kp.getTourId();
        r.name        = kp.getName();
        r.description = kp.getDescription();
        r.imageUrl    = kp.getImageUrl();
        r.latitude    = kp.getLatitude();
        r.longitude   = kp.getLongitude();
        return r;
    }

    public Long getId()           { return id; }
    public Long getTourId()       { return tourId; }
    public String getName()       { return name; }
    public String getDescription(){ return description; }
    public String getImageUrl()   { return imageUrl; }
    public Double getLatitude()   { return latitude; }
    public Double getLongitude()  { return longitude; }
}
