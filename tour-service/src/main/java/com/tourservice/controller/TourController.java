package com.tourservice.controller;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.tourservice.dto.CreateTourRequest;
import com.tourservice.dto.TourResponse;
import com.tourservice.model.Tour;
import com.tourservice.repository.TourRepository;
import com.tourservice.util.JwtUtil;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/tours")
public class TourController {

    private final TourRepository tourRepository;
    private final JwtUtil jwtUtil;

    public TourController(TourRepository tourRepository, JwtUtil jwtUtil) {
        this.tourRepository = tourRepository;
        this.jwtUtil = jwtUtil;
    }

    // POST
    @PostMapping
    public ResponseEntity<?> createTour(
            @RequestHeader("Authorization") String authHeader,
            @Valid @RequestBody CreateTourRequest req) {

        Long authorId = jwtUtil.extractUserId(authHeader);
        if (authorId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }

        Tour tour = new Tour();
        tour.setName(req.getName());
        tour.setDescription(req.getDescription());
        tour.setDifficulty(req.getDifficulty());
        tour.setTags(req.getTags() != null ? req.getTags() : List.of());
        tour.setStatus("DRAFT");
        tour.setPrice(req.getPrice() != null ? req.getPrice() : BigDecimal.ZERO);
        tour.setAuthorId(authorId);
        tour.setCreatedAt(LocalDateTime.now());

        Tour saved = tourRepository.save(tour);
        return ResponseEntity.status(201).body(TourResponse.from(saved));
    }

    // GET
    @GetMapping("/my")
    public ResponseEntity<?> getMyTours(
            @RequestHeader("Authorization") String authHeader) {

        Long authorId = jwtUtil.extractUserId(authHeader);
        if (authorId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }

        List<TourResponse> tours = tourRepository
                .findByAuthorIdOrderByCreatedAtDesc(authorId)
                .stream()
                .map(TourResponse::from)
                .collect(Collectors.toList());

        return ResponseEntity.ok(tours);
    }
}
