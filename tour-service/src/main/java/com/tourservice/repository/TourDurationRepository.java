package com.tourservice.repository;

import com.tourservice.model.TourDuration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TourDurationRepository extends JpaRepository<TourDuration, Long> {
    List<TourDuration> findByTourId(Long tourId);
}
