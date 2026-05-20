package com.purchaseservice.dto;

import java.time.LocalDateTime;

import com.purchaseservice.model.TourPurchaseToken;

public class TourPurchaseTokenResponse {

    private Long id;
    private Long touristId;
    private Long tourId;
    private String tourName;
    private String token;
    private LocalDateTime purchasedAt;

    public static TourPurchaseTokenResponse from(TourPurchaseToken t) {
        TourPurchaseTokenResponse r = new TourPurchaseTokenResponse();
        r.id          = t.getId();
        r.touristId   = t.getTouristId();
        r.tourId      = t.getTourId();
        r.tourName    = t.getTourName();
        r.token       = t.getToken();
        r.purchasedAt = t.getPurchasedAt();
        return r;
    }

    public Long getId()               { return id; }
    public Long getTouristId()        { return touristId; }
    public Long getTourId()           { return tourId; }
    public String getTourName()       { return tourName; }
    public String getToken()          { return token; }
    public LocalDateTime getPurchasedAt() { return purchasedAt; }
}
