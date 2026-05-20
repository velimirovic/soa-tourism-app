package com.purchaseservice.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.purchaseservice.dto.AddToCartRequest;
import com.purchaseservice.service.ShoppingCartService;
import com.purchaseservice.util.JwtUtil;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/purchases")
public class ShoppingCartController {

    private final ShoppingCartService service;
    private final JwtUtil jwtUtil;

    public ShoppingCartController(ShoppingCartService service, JwtUtil jwtUtil) {
        this.service  = service;
        this.jwtUtil  = jwtUtil;
    }

    // ─── Korpa ─────────────────────────────────────────────────────────────────

    @GetMapping("/shopping-cart")
    public ResponseEntity<?> getCart(@RequestHeader("Authorization") String auth) {
        Long touristId = jwtUtil.extractUserId(auth);
        if (touristId == null) return unauthorized();
        return ResponseEntity.ok(service.getCart(touristId));
    }

    @PostMapping("/shopping-cart/items")
    public ResponseEntity<?> addItem(
            @RequestHeader("Authorization") String auth,
            @Valid @RequestBody AddToCartRequest req) {

        Long touristId = jwtUtil.extractUserId(auth);
        if (touristId == null) return unauthorized();

        try {
            return ResponseEntity.ok(service.addItem(touristId, req, auth));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(400).body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(503).body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/shopping-cart/items/{tourId}")
    public ResponseEntity<?> removeItem(
            @RequestHeader("Authorization") String auth,
            @PathVariable Long tourId) {

        Long touristId = jwtUtil.extractUserId(auth);
        if (touristId == null) return unauthorized();

        try {
            return ResponseEntity.ok(service.removeItem(touristId, tourId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(400).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/shopping-cart/checkout")
    public ResponseEntity<?> checkout(@RequestHeader("Authorization") String auth) {
        Long touristId = jwtUtil.extractUserId(auth);
        if (touristId == null) return unauthorized();

        try {
            return ResponseEntity.ok(service.checkout(touristId));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(400).body(Map.of("error", e.getMessage()));
        }
    }

    // ─── Tokeni ────────────────────────────────────────────────────────────────

    @GetMapping("/purchase-tokens")
    public ResponseEntity<?> getTokens(@RequestHeader("Authorization") String auth) {
        Long touristId = jwtUtil.extractUserId(auth);
        if (touristId == null) return unauthorized();
        return ResponseEntity.ok(service.getTokens(touristId));
    }

    // Koristi tour-service da provjeri da li je turista kupio turu
    @GetMapping("/purchase-tokens/check")
    public ResponseEntity<?> checkPurchase(
            @RequestHeader("Authorization") String auth,
            @RequestParam Long tourId) {

        Long touristId = jwtUtil.extractUserId(auth);
        if (touristId == null) return unauthorized();
        return ResponseEntity.ok(Map.of("purchased", service.hasPurchased(touristId, tourId)));
    }

    // ─── Helper ────────────────────────────────────────────────────────────────

    private ResponseEntity<?> unauthorized() {
        return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
    }
}
