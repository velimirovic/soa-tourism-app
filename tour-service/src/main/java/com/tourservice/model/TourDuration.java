package com.tourservice.model;

import jakarta.persistence.*;

@Entity
@Table(name = "tour_durations")
public class TourDuration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long tourId;

    @Column(nullable = false)
    private String transportType;

    @Column(nullable = false)
    private Integer durationInMinutes;

    public Long getId()                              { return id; }
    public void setId(Long id)                       { this.id = id; }

    public Long getTourId()                          { return tourId; }
    public void setTourId(Long tourId)               { this.tourId = tourId; }

    public String getTransportType()                 { return transportType; }
    public void setTransportType(String t)           { this.transportType = t; }

    public Integer getDurationInMinutes()            { return durationInMinutes; }
    public void setDurationInMinutes(Integer d)      { this.durationInMinutes = d; }
}
