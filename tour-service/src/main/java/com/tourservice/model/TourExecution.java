package com.tourservice.model;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "tour_executions")
public class TourExecution {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long touristId;

    @Column(nullable = false)
    private Long tourId;

    @Column(nullable = false)
    private String status; // ACTIVE, COMPLETED, ABANDONED

    @Column(nullable = false)
    private LocalDateTime startedAt;

    private LocalDateTime endedAt;

    @Column(nullable = false)
    private LocalDateTime lastActivity;

    private Double startLatitude;
    private Double startLongitude;

    public Long getId()                        { return id; }
    public void setId(Long id)                 { this.id = id; }

    public Long getTouristId()                 { return touristId; }
    public void setTouristId(Long touristId)   { this.touristId = touristId; }

    public Long getTourId()                    { return tourId; }
    public void setTourId(Long tourId)         { this.tourId = tourId; }

    public String getStatus()                  { return status; }
    public void setStatus(String status)       { this.status = status; }

    public LocalDateTime getStartedAt()        { return startedAt; }
    public void setStartedAt(LocalDateTime t)  { this.startedAt = t; }

    public LocalDateTime getEndedAt()          { return endedAt; }
    public void setEndedAt(LocalDateTime t)    { this.endedAt = t; }

    public LocalDateTime getLastActivity()     { return lastActivity; }
    public void setLastActivity(LocalDateTime t) { this.lastActivity = t; }

    public Double getStartLatitude()           { return startLatitude; }
    public void setStartLatitude(Double v)     { this.startLatitude = v; }

    public Double getStartLongitude()          { return startLongitude; }
    public void setStartLongitude(Double v)    { this.startLongitude = v; }
}
