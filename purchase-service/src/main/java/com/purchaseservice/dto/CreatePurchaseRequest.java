package com.purchaseservice.dto;

import jakarta.validation.constraints.NotNull;

public class CreatePurchaseRequest {

    @NotNull
    private Long tourId;

    @NotNull
    private Long touristId;

    public Long getTourId() { return tourId; }
    public void setTourId(Long tourId) { this.tourId = tourId; }
    public Long getTouristId() { return touristId; }
    public void setTouristId(Long touristId) { this.touristId = touristId; }
}
