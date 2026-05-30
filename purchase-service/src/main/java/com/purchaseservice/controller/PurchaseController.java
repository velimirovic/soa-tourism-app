package com.purchaseservice.controller;

import com.purchaseservice.dto.PurchaseResponse;
import com.purchaseservice.repository.PurchaseRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/purchases")
public class PurchaseController {

    private final PurchaseRepository purchaseRepository;

    public PurchaseController(PurchaseRepository purchaseRepository) {
        this.purchaseRepository = purchaseRepository;
    }

    @GetMapping("/tourist/{touristId}")
    public ResponseEntity<List<PurchaseResponse>> getPurchasesByTourist(@PathVariable Long touristId) {
        List<PurchaseResponse> list = purchaseRepository
                .findByTouristIdOrderByCreatedAtDesc(touristId)
                .stream()
                .map(PurchaseResponse::from)
                .toList();
        return ResponseEntity.ok(list);
    }

    @GetMapping("/{id}")
    public ResponseEntity<PurchaseResponse> getPurchase(@PathVariable Long id) {
        return purchaseRepository.findById(id)
                .map(p -> ResponseEntity.ok(PurchaseResponse.from(p)))
                .orElse(ResponseEntity.notFound().build());
    }
}
