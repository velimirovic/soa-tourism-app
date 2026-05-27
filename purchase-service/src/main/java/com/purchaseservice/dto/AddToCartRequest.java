package com.purchaseservice.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class AddToCartRequest {

    @NotNull(message = "tourId is required")
    private Long tourId;

    @NotBlank(message = "tourName is required")
    private String tourName;

    @NotNull(message = "price is required")
    @DecimalMin(value = "0.0", message = "price must be non-negative")
    private BigDecimal price;

    public Long getTourId()       { return tourId; }
    public String getTourName()   { return tourName; }
    public BigDecimal getPrice()  { return price; }

    public void setTourId(Long tourId)       { this.tourId = tourId; }
    public void setTourName(String tourName) { this.tourName = tourName; }
    public void setPrice(BigDecimal price)   { this.price = price; }
}
