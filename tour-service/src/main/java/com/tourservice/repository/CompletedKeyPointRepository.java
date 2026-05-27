package com.tourservice.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.tourservice.model.CompletedKeyPoint;

public interface CompletedKeyPointRepository extends JpaRepository<CompletedKeyPoint, Long> {
    List<CompletedKeyPoint> findByExecutionId(Long executionId);
}
