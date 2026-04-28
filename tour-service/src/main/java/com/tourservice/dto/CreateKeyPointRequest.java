package com.tourservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class CreateKeyPointRequest {

    @NotBlank(message = "Name is required")
    private String name;

    private String description;

    private String imageUrl;

    @NotNull(message = "Latitude is required")
    private Double latitude;

    @NotNull(message = "Longitude is required")
    private Double longitude;

    public String getName()                { return name; }
    public void setName(String name)       { this.name = name; }

    public String getDescription()                   { return description; }
    public void setDescription(String description)   { this.description = description; }

    public String getImageUrl()                { return imageUrl; }
    public void setImageUrl(String imageUrl)   { this.imageUrl = imageUrl; }

    public Double getLatitude()                { return latitude; }
    public void setLatitude(Double latitude)   { this.latitude = latitude; }

    public Double getLongitude()                 { return longitude; }
    public void setLongitude(Double longitude)   { this.longitude = longitude; }
}
