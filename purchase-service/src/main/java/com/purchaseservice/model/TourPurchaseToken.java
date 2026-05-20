package com.purchaseservice.model;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "tour_purchase_tokens",
       uniqueConstraints = {
           @UniqueConstraint(columnNames = {"tourist_id", "tour_id"}),
           @UniqueConstraint(columnNames = {"token"})
       })
public class TourPurchaseToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tourist_id", nullable = false)
    private Long touristId;

    @Column(name = "tour_id", nullable = false)
    private Long tourId;

    @Column(name = "tour_name", nullable = false)
    private String tourName;

    @Column(nullable = false, unique = true, length = 36)
    private String token;

    @Column(name = "purchased_at", nullable = false)
    private LocalDateTime purchasedAt;

    public Long getId()               { return id; }
    public Long getTouristId()        { return touristId; }
    public Long getTourId()           { return tourId; }
    public String getTourName()       { return tourName; }
    public String getToken()          { return token; }
    public LocalDateTime getPurchasedAt() { return purchasedAt; }

    public void setTouristId(Long touristId)        { this.touristId = touristId; }
    public void setTourId(Long tourId)              { this.tourId = tourId; }
    public void setTourName(String tourName)        { this.tourName = tourName; }
    public void setToken(String token)              { this.token = token; }
    public void setPurchasedAt(LocalDateTime at)    { this.purchasedAt = at; }
}
