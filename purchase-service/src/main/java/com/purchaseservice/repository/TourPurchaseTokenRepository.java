package com.purchaseservice.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.purchaseservice.model.TourPurchaseToken;

public interface TourPurchaseTokenRepository extends JpaRepository<TourPurchaseToken, Long> {
    boolean existsByTouristIdAndTourId(Long touristId, Long tourId);
    Optional<TourPurchaseToken> findByTouristIdAndTourId(Long touristId, Long tourId);
    List<TourPurchaseToken> findByTouristId(Long touristId);
}
