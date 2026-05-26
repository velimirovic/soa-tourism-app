package com.purchaseservice.controller;

import com.purchaseservice.dto.CreatePurchaseRequest;
import com.purchaseservice.dto.PurchaseResponse;
import com.purchaseservice.model.Purchase;
import com.purchaseservice.repository.PurchaseRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/purchases")
public class PurchaseController {

    private final PurchaseRepository purchaseRepository;
    private final RestTemplate restTemplate;

    @Value("${tour.service.url:http://tour-service:8080}")
    private String tourServiceUrl;

    public PurchaseController(PurchaseRepository purchaseRepository) {
        this.purchaseRepository = purchaseRepository;
        this.restTemplate = new RestTemplate();
    }

    // POST /purchases — SAGA Choreography: kreira kupovinu i koordinira sa tour-service
    @PostMapping
    public ResponseEntity<PurchaseResponse> createPurchase(@Valid @RequestBody CreatePurchaseRequest req) {

        // SAGA korak 1: kreiraj kupovinu sa statusom PENDING
        Purchase purchase = new Purchase();
        purchase.setTourId(req.getTourId());
        purchase.setTouristId(req.getTouristId());
        purchase.setStatus("PENDING");
        purchaseRepository.save(purchase);

        // SAGA korak 2: pitaj tour-service da li je tura dostupna za kupovinu
        boolean tourAvailable = checkTourAvailability(req.getTourId());

        if (tourAvailable) {
            // SAGA korak 3a: tura dostupna — potvrdi kupovinu
            purchase.setStatus("CONFIRMED");
        } else {
            // SAGA kompenzacija: tura nije dostupna — otkaži kupovinu
            purchase.setStatus("CANCELLED");
        }

        purchaseRepository.save(purchase);
        return ResponseEntity.ok(PurchaseResponse.from(purchase));
    }

    // GET /purchases/tourist/{touristId}
    @GetMapping("/tourist/{touristId}")
    public ResponseEntity<List<PurchaseResponse>> getPurchasesByTourist(@PathVariable Long touristId) {
        List<PurchaseResponse> list = purchaseRepository
                .findByTouristIdOrderByCreatedAtDesc(touristId)
                .stream()
                .map(PurchaseResponse::from)
                .toList();
        return ResponseEntity.ok(list);
    }

    // GET /purchases/{id}
    @GetMapping("/{id}")
    public ResponseEntity<PurchaseResponse> getPurchase(@PathVariable Long id) {
        return purchaseRepository.findById(id)
                .map(p -> ResponseEntity.ok(PurchaseResponse.from(p)))
                .orElse(ResponseEntity.notFound().build());
    }

    // Choreography: purchase-service sam poziva tour-service i reaguje na odgovor
    private boolean checkTourAvailability(Long tourId) {
        try {
            String url = tourServiceUrl + "/tours/" + tourId + "/availability";
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Object available = response.getBody().get("available");
                return Boolean.TRUE.equals(available);
            }
            return false;
        } catch (Exception e) {
            // Tour-service nedostupan — kompenzacija se aktivira
            return false;
        }
    }
}
