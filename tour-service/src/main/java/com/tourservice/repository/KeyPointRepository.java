package com.tourservice.repository;

import com.tourservice.model.KeyPoint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface KeyPointRepository extends JpaRepository<KeyPoint, Long> {
    List<KeyPoint> findByTourIdOrderById(Long tourId);
}
