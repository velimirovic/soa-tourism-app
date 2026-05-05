package com.tourservice.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "reviews")
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long tourId;

    @Column(nullable = false)
    private Long touristId;

    private String touristName;

    @Column(nullable = false)
    private Integer rating;

    @Column(columnDefinition = "TEXT")
    private String comment;

    @Column(nullable = false)
    private LocalDate visitDate;

    @Column(nullable = false)
    private LocalDateTime commentDate;

    @ElementCollection
    @CollectionTable(name = "review_images", joinColumns = @JoinColumn(name = "review_id"))
    @Column(name = "image_url", columnDefinition = "TEXT")
    private List<String> images;

    public Long getId()                              { return id; }
    public void setId(Long id)                       { this.id = id; }

    public Long getTourId()                          { return tourId; }
    public void setTourId(Long tourId)               { this.tourId = tourId; }

    public Long getTouristId()                       { return touristId; }
    public void setTouristId(Long touristId)         { this.touristId = touristId; }

    public String getTouristName()                   { return touristName; }
    public void setTouristName(String touristName)   { this.touristName = touristName; }

    public Integer getRating()                       { return rating; }
    public void setRating(Integer rating)            { this.rating = rating; }

    public String getComment()                       { return comment; }
    public void setComment(String comment)           { this.comment = comment; }

    public LocalDate getVisitDate()                  { return visitDate; }
    public void setVisitDate(LocalDate visitDate)    { this.visitDate = visitDate; }

    public LocalDateTime getCommentDate()            { return commentDate; }
    public void setCommentDate(LocalDateTime d)      { this.commentDate = d; }

    public List<String> getImages()                  { return images; }
    public void setImages(List<String> images)       { this.images = images; }
}
