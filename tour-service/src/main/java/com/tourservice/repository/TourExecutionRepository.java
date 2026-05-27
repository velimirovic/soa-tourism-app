package com.tourservice.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.tourservice.model.TourExecution;

public interface TourExecutionRepository extends JpaRepository<TourExecution, Long> {
    Optional<TourExecution> findByTouristIdAndStatus(Long touristId, String status);
    Optional<TourExecution> findByTouristIdAndTourIdAndStatus(Long touristId, Long tourId, String status);
    List<TourExecution> findAllByTouristIdAndStatus(Long touristId, String status);
}
