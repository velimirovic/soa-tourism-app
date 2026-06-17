package com.purchaseservice.dto;

import com.purchaseservice.model.Purchase;
import java.time.LocalDateTime;

public class PurchaseResponse {
    private Long id;
    private Long tourId;
    private Long touristId;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static PurchaseResponse from(Purchase p) {
        PurchaseResponse r = new PurchaseResponse();
        r.id         = p.getId();
        r.tourId     = p.getTourId();
        r.touristId  = p.getTouristId();
        r.status     = p.getStatus();
        r.createdAt  = p.getCreatedAt();
        r.updatedAt  = p.getUpdatedAt();
        return r;
    }

    public Long getId() { return id; }
    public Long getTourId() { return tourId; }
    public Long getTouristId() { return touristId; }
    public String getStatus() { return status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
