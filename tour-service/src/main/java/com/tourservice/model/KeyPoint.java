package com.tourservice.model;

import jakarta.persistence.*;

@Entity
@Table(name = "key_points")
public class KeyPoint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long tourId;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String imageUrl;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    public Long getId()                    { return id; }
    public void setId(Long id)             { this.id = id; }

    public Long getTourId()                { return tourId; }
    public void setTourId(Long tourId)     { this.tourId = tourId; }

    public String getName()                { return name; }
    public void setName(String name)       { this.name = name; }

    public String getDescription()                   { return description; }
    public void setDescription(String description)   { this.description = description; }

    public String getImageUrl()                { return imageUrl; }
    public void setImageUrl(String imageUrl)   { this.imageUrl = imageUrl; }

    public Double getLatitude()                { return latitude; }
    public void setLatitude(Double latitude)   { this.latitude = latitude; }

    public Double getLongitude()                 { return longitude; }
    public void setLongitude(Double longitude)   { this.longitude = longitude; }
}
