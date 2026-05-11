package com.tourservice.dto;

import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.util.List;

public class CreateReviewRequest {

    @NotNull
    @Min(1) @Max(5)
    private Integer rating;

    private String comment;

    private String touristName;

    @NotNull
    private LocalDate visitDate;

    private List<String> images;

    public Integer getRating()                     { return rating; }
    public void setRating(Integer rating)          { this.rating = rating; }

    public String getComment()                     { return comment; }
    public void setComment(String comment)         { this.comment = comment; }

    public String getTouristName()                 { return touristName; }
    public void setTouristName(String n)           { this.touristName = n; }

    public LocalDate getVisitDate()                { return visitDate; }
    public void setVisitDate(LocalDate visitDate)  { this.visitDate = visitDate; }

    public List<String> getImages()                { return images; }
    public void setImages(List<String> images)     { this.images = images; }
}
