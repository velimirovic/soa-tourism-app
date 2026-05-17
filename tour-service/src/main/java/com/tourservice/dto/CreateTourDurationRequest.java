package com.tourservice.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public class CreateTourDurationRequest {

    @NotBlank(message = "Transport type is required")
    @Pattern(regexp = "WALKING|BICYCLE|CAR", message = "Transport type must be WALKING, BICYCLE or CAR")
    private String transportType;

    @NotNull(message = "Duration is required")
    @Min(value = 1, message = "Duration must be at least 1 minute")
    private Integer durationInMinutes;

    public String getTransportType()               { return transportType; }
    public void setTransportType(String t)         { this.transportType = t; }

    public Integer getDurationInMinutes()          { return durationInMinutes; }
    public void setDurationInMinutes(Integer d)    { this.durationInMinutes = d; }
}
