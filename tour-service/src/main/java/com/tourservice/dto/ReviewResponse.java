package com.tourservice.dto;

import com.tourservice.model.Review;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class ReviewResponse {

    private Long id;
    private Long tourId;
    private Long touristId;
    private String touristName;
    private Integer rating;
    private String comment;
    private LocalDate visitDate;
    private LocalDateTime commentDate;
    private List<String> images;

    public static ReviewResponse from(Review r) {
        ReviewResponse res = new ReviewResponse();
        res.id          = r.getId();
        res.tourId      = r.getTourId();
        res.touristId   = r.getTouristId();
        res.touristName = r.getTouristName();
        res.rating      = r.getRating();
        res.comment     = r.getComment();
        res.visitDate   = r.getVisitDate();
        res.commentDate = r.getCommentDate();
        res.images      = r.getImages();
        return res;
    }

    public Long getId()                  { return id; }
    public Long getTourId()              { return tourId; }
    public Long getTouristId()           { return touristId; }
    public String getTouristName()       { return touristName; }
    public Integer getRating()           { return rating; }
    public String getComment()           { return comment; }
    public LocalDate getVisitDate()      { return visitDate; }
    public LocalDateTime getCommentDate(){ return commentDate; }
    public List<String> getImages()      { return images; }
}
