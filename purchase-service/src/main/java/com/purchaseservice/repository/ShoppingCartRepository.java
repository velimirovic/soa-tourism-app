package com.purchaseservice.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.purchaseservice.model.ShoppingCart;

public interface ShoppingCartRepository extends JpaRepository<ShoppingCart, Long> {
    Optional<ShoppingCart> findByTouristId(Long touristId);
}
