package com.tourservice.controller;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.tourservice.dto.CreateKeyPointRequest;
import com.tourservice.dto.CreateTourRequest;
import com.tourservice.dto.KeyPointResponse;
import com.tourservice.dto.TourResponse;
import com.tourservice.model.KeyPoint;
import com.tourservice.model.Tour;
import com.tourservice.repository.KeyPointRepository;
import com.tourservice.repository.TourRepository;
import com.tourservice.util.JwtUtil;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/tours")
public class TourController {

    private final TourRepository tourRepository;
    private final KeyPointRepository keyPointRepository;
    private final JwtUtil jwtUtil;

    public TourController(TourRepository tourRepository,
                          KeyPointRepository keyPointRepository,
                          JwtUtil jwtUtil) {
        this.tourRepository = tourRepository;
        this.keyPointRepository = keyPointRepository;
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

    // GET /tours/my
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
                .map(tour -> {
                    String img = keyPointRepository.findByTourIdOrderById(tour.getId())
                            .stream()
                            .map(kp -> kp.getImageUrl())
                            .filter(url -> url != null && !url.isBlank())
                            .findFirst()
                            .orElse(null);
                    return TourResponse.from(tour, img);
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(tours);
    }

    // GET /tours  — sve ture (za Tourist prikaz)
    @GetMapping
    public ResponseEntity<?> getAllTours(
            @RequestHeader("Authorization") String authHeader) {

        Long userId = jwtUtil.extractUserId(authHeader);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }

        List<TourResponse> tours = tourRepository.findAll()
                .stream()
                .map(tour -> {
                    String img = keyPointRepository.findByTourIdOrderById(tour.getId())
                            .stream()
                            .map(kp -> kp.getImageUrl())
                            .filter(url -> url != null && !url.isBlank())
                            .findFirst()
                            .orElse(null);
                    return TourResponse.from(tour, img);
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(tours);
    }

    // PUT /tours/{id}  — edit ture (samo autor)
    @PutMapping("/{id}")
    public ResponseEntity<?> updateTour(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id,
            @Valid @RequestBody CreateTourRequest req) {

        Long authorId = jwtUtil.extractUserId(authHeader);
        if (authorId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }

        return tourRepository.findById(id).map(tour -> {
            if (!tour.getAuthorId().equals(authorId)) {
                return ResponseEntity.status(403).body(Map.of("error", "Forbidden"));
            }
            tour.setName(req.getName());
            tour.setDescription(req.getDescription());
            tour.setDifficulty(req.getDifficulty());
            tour.setTags(req.getTags() != null ? req.getTags() : List.of());
            return ResponseEntity.ok((Object) TourResponse.from(tourRepository.save(tour)));
        }).orElse(ResponseEntity.status(404).body(Map.of("error", "Tour not found")));
    }

    // POST /tours/{tourId}/keypoints
    @PostMapping("/{tourId}/keypoints")
    public ResponseEntity<?> addKeyPoint(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long tourId,
            @Valid @RequestBody CreateKeyPointRequest req) {

        Long authorId = jwtUtil.extractUserId(authHeader);
        if (authorId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }

        boolean tourOwned = tourRepository.findById(tourId)
                .map(t -> t.getAuthorId().equals(authorId))
                .orElse(false);
        if (!tourOwned) {
            return ResponseEntity.status(403).body(Map.of("error", "Forbidden"));
        }

        KeyPoint kp = new KeyPoint();
        kp.setTourId(tourId);
        kp.setName(req.getName());
        kp.setDescription(req.getDescription());
        kp.setImageUrl(req.getImageUrl());
        kp.setLatitude(req.getLatitude());
        kp.setLongitude(req.getLongitude());

        KeyPoint saved = keyPointRepository.save(kp);
        return ResponseEntity.status(201).body(KeyPointResponse.from(saved));
    }

    // GET /tours/{tourId}/keypoints
    @GetMapping("/{tourId}/keypoints")
    public ResponseEntity<?> getKeyPoints(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long tourId) {

        Long authorId = jwtUtil.extractUserId(authHeader);
        if (authorId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }

        List<KeyPointResponse> keyPoints = keyPointRepository
                .findByTourIdOrderById(tourId)
                .stream()
                .map(KeyPointResponse::from)
                .collect(Collectors.toList());

        return ResponseEntity.ok(keyPoints);
    }

    // DELETE /tours/{tourId}/keypoints/{keyPointId}
    @DeleteMapping("/{tourId}/keypoints/{keyPointId}")
    public ResponseEntity<?> deleteKeyPoint(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long tourId,
            @PathVariable Long keyPointId) {

        Long authorId = jwtUtil.extractUserId(authHeader);
        if (authorId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }

        boolean tourOwned = tourRepository.findById(tourId)
                .map(t -> t.getAuthorId().equals(authorId))
                .orElse(false);
        if (!tourOwned) {
            return ResponseEntity.status(403).body(Map.of("error", "Forbidden"));
        }

        if (!keyPointRepository.existsById(keyPointId)) {
            return ResponseEntity.status(404).body(Map.of("error", "Key point not found"));
        }

        keyPointRepository.deleteById(keyPointId);
        return ResponseEntity.noContent().build();
    }
}
