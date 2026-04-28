package com.tourservice.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import com.tourservice.model.Tour;

public class TourResponse {

    private Long id;
    private String name;
    private String description;
    private String difficulty;
    private List<String> tags;
    private String status;
    private BigDecimal price;
    private Long authorId;
    private LocalDateTime createdAt;
    private String firstKeyPointImageUrl;

    public static TourResponse from(Tour tour) {
        TourResponse res = new TourResponse();
        res.id          = tour.getId();
        res.name        = tour.getName();
        res.description = tour.getDescription();
        res.difficulty  = tour.getDifficulty();
        res.tags        = tour.getTags();
        res.status      = tour.getStatus();
        res.price       = tour.getPrice();
        res.authorId    = tour.getAuthorId();
        res.createdAt   = tour.getCreatedAt();
        return res;
    }

    public static TourResponse from(Tour tour, String firstKeyPointImageUrl) {
        TourResponse res = from(tour);
        res.firstKeyPointImageUrl = firstKeyPointImageUrl;
        return res;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public String getDifficulty() { return difficulty; }
    public List<String> getTags() { return tags; }
    public String getStatus() { return status; }
    public BigDecimal getPrice() { return price; }
    public Long getAuthorId() { return authorId; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public String getFirstKeyPointImageUrl() { return firstKeyPointImageUrl; }
}
