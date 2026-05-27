package com.tourservice.model;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "completed_key_points")
public class CompletedKeyPoint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long executionId;

    @Column(nullable = false)
    private Long keyPointId;

    @Column(nullable = false)
    private LocalDateTime completedAt;

    public Long getId()                        { return id; }
    public void setId(Long id)                 { this.id = id; }

    public Long getExecutionId()               { return executionId; }
    public void setExecutionId(Long v)         { this.executionId = v; }

    public Long getKeyPointId()                { return keyPointId; }
    public void setKeyPointId(Long v)          { this.keyPointId = v; }

    public LocalDateTime getCompletedAt()      { return completedAt; }
    public void setCompletedAt(LocalDateTime t) { this.completedAt = t; }
}
