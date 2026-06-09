package com.tourservice.controller;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
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
import com.tourservice.dto.CreateReviewRequest;
import com.tourservice.dto.CreateTourDurationRequest;
import com.tourservice.dto.CreateTourRequest;
import com.tourservice.dto.KeyPointResponse;
import com.tourservice.dto.ReviewResponse;
import com.tourservice.dto.TourDurationResponse;
import com.tourservice.dto.TourResponse;
import com.tourservice.model.KeyPoint;
import com.tourservice.model.Review;
import com.tourservice.model.Tour;
import com.tourservice.model.TourDuration;
import com.tourservice.repository.KeyPointRepository;
import com.tourservice.repository.ReviewRepository;
import com.tourservice.repository.TourDurationRepository;
import com.tourservice.repository.TourExecutionRepository;
import com.tourservice.repository.TourRepository;
import com.tourservice.util.JwtUtil;

import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;

@RestController
@RequestMapping("/tours")
public class TourController {

    private static final Logger log = LoggerFactory.getLogger(TourController.class);

    @Value("${purchase.service.base-url:http://purchase-service:8080}")
    private String purchaseServiceBaseUrl;

    private final TourRepository tourRepository;
    private final KeyPointRepository keyPointRepository;
    private final ReviewRepository reviewRepository;
    private final TourDurationRepository tourDurationRepository;
    private final TourExecutionRepository tourExecutionRepository;
    private final JwtUtil jwtUtil;

    public TourController(TourRepository tourRepository,
                          KeyPointRepository keyPointRepository,
                          ReviewRepository reviewRepository,
                          TourDurationRepository tourDurationRepository,
                          TourExecutionRepository tourExecutionRepository,
                          JwtUtil jwtUtil) {
        this.tourRepository          = tourRepository;
        this.keyPointRepository      = keyPointRepository;
        this.reviewRepository        = reviewRepository;
        this.tourDurationRepository  = tourDurationRepository;
        this.tourExecutionRepository = tourExecutionRepository;
        this.jwtUtil                 = jwtUtil;
    }

    // ─── Kreiranje ture ────────────────────────────────────────────────────────

    @PostMapping
    public ResponseEntity<?> createTour(
            @RequestHeader("Authorization") String authHeader,
            @Valid @RequestBody CreateTourRequest req) {

        Long authorId = jwtUtil.extractUserId(authHeader);
        if (authorId == null) {
            log.warn("Unauthorized tour creation attempt");
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
        MDC.put("tourId", String.valueOf(saved.getId()));
        MDC.put("userId", String.valueOf(authorId));
        MDC.put("action", "TOUR_CREATED");
        log.info("Tour created: name={}, difficulty={}", saved.getName(), saved.getDifficulty());
        MDC.clear();
        return ResponseEntity.status(201).body(TourResponse.from(saved));
    }

    // ─── Ažuriranje ture ───────────────────────────────────────────────────────

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

    // ─── Listanje tura ─────────────────────────────────────────────────────────

    // Samo PUBLISHED ture (javni listing za turiste)
    @GetMapping
    public ResponseEntity<?> getAllTours(
            @RequestHeader("Authorization") String authHeader) {

        Long userId = jwtUtil.extractUserId(authHeader);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }

        List<TourResponse> tours = tourRepository.findByStatusOrderByPublishedAtDesc("PUBLISHED")
                .stream()
                .map(tour -> {
                    List<KeyPoint> kps = keyPointRepository.findByTourIdOrderById(tour.getId());
                    KeyPointResponse firstKp = kps.isEmpty() ? null : KeyPointResponse.from(kps.get(0));
                    List<TourDurationResponse> durations = tourDurationRepository.findByTourId(tour.getId())
                            .stream().map(TourDurationResponse::from).collect(Collectors.toList());
                    return TourResponse.from(tour, firstKp, durations);
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(tours);
    }

    // Ture autora (sve statuse)
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
                    List<KeyPoint> kps = keyPointRepository.findByTourIdOrderById(tour.getId());
                    KeyPointResponse firstKp = kps.isEmpty() ? null : KeyPointResponse.from(kps.get(0));
                    List<TourDurationResponse> durations = tourDurationRepository.findByTourId(tour.getId())
                            .stream().map(TourDurationResponse::from).collect(Collectors.toList());
                    return TourResponse.from(tour, firstKp, durations);
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(tours);
    }

    // Detalj ture – turista vidi samo PUBLISHED, ostali vide sve
    @GetMapping("/{tourId}")
    public ResponseEntity<?> getTour(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long tourId) {

        Long userId = jwtUtil.extractUserId(authHeader);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }

        String role = jwtUtil.extractRole(authHeader);
        boolean isTourist = "Tourist".equalsIgnoreCase(role);

        return tourRepository.findById(tourId).map(tour -> {
            if (isTourist && !"PUBLISHED".equals(tour.getStatus())) {
                return ResponseEntity.status(404).body(Map.of("error", "Tour not found"));
            }
            List<KeyPoint> kps = keyPointRepository.findByTourIdOrderById(tour.getId());
            KeyPointResponse firstKp = kps.isEmpty() ? null : KeyPointResponse.from(kps.get(0));
            List<TourDurationResponse> durations = tourDurationRepository.findByTourId(tour.getId())
                    .stream().map(TourDurationResponse::from).collect(Collectors.toList());
            return ResponseEntity.ok((Object) TourResponse.from(tour, firstKp, durations));
        }).orElse(ResponseEntity.status(404).body(Map.of("error", "Tour not found")));
    }

    // ─── Upravljanje statusom ──────────────────────────────────────────────────

    // Objavi turu (DRAFT → PUBLISHED)
    @PostMapping("/{id}/publish")
    public ResponseEntity<?> publishTour(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id) {

        Long authorId = jwtUtil.extractUserId(authHeader);
        if (authorId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }

        return tourRepository.findById(id).map(tour -> {
            if (!tour.getAuthorId().equals(authorId)) {
                return ResponseEntity.status(403).body(Map.of("error", "Forbidden"));
            }

            // Provjera osnovnih podataka
            if (isBlank(tour.getName()) || isBlank(tour.getDescription())
                    || isBlank(tour.getDifficulty()) || tour.getTags() == null || tour.getTags().isEmpty()) {
                return ResponseEntity.status(400).body(Map.of("error",
                        "Tour must have name, description, difficulty and at least one tag"));
            }

            // Provjera ključnih tačaka
            List<KeyPoint> kps = keyPointRepository.findByTourIdOrderById(id);
            if (kps.size() < 2) {
                return ResponseEntity.status(400).body(Map.of("error",
                        "Tour must have at least 2 key points"));
            }

            // Provjera trajanja
            List<TourDuration> durations = tourDurationRepository.findByTourId(id);
            if (durations.isEmpty()) {
                return ResponseEntity.status(400).body(Map.of("error",
                        "Tour must have at least one duration defined"));
            }

            tour.setStatus("PUBLISHED");
            tour.setPublishedAt(LocalDateTime.now());
            Tour saved = tourRepository.save(tour);

            MDC.put("tourId", String.valueOf(saved.getId()));
            MDC.put("userId", String.valueOf(authorId));
            MDC.put("action", "TOUR_PUBLISHED");
            log.info("Tour published: name={}, keyPoints={}, durations={}", saved.getName(), kps.size(), durations.size());
            MDC.clear();

            List<TourDurationResponse> durationResponses = durations.stream()
                    .map(TourDurationResponse::from).collect(Collectors.toList());
            KeyPointResponse firstKp = KeyPointResponse.from(kps.get(0));
            return ResponseEntity.ok((Object) TourResponse.from(saved, firstKp, durationResponses));
        }).orElse(ResponseEntity.status(404).body(Map.of("error", "Tour not found")));
    }

    // Arhiviraj turu (PUBLISHED → ARCHIVED)
    @PostMapping("/{id}/archive")
    public ResponseEntity<?> archiveTour(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id) {

        Long authorId = jwtUtil.extractUserId(authHeader);
        if (authorId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }

        return tourRepository.findById(id).map(tour -> {
            if (!tour.getAuthorId().equals(authorId)) {
                return ResponseEntity.status(403).body(Map.of("error", "Forbidden"));
            }
            if (!"PUBLISHED".equals(tour.getStatus())) {
                return ResponseEntity.status(400).body(Map.of("error",
                        "Only published tours can be archived"));
            }
            tour.setStatus("ARCHIVED");
            tour.setArchivedAt(LocalDateTime.now());
            Tour saved = tourRepository.save(tour);
            MDC.put("tourId", String.valueOf(saved.getId()));
            MDC.put("userId", String.valueOf(authorId));
            MDC.put("action", "TOUR_ARCHIVED");
            log.info("Tour archived: name={}", saved.getName());
            MDC.clear();
            return ResponseEntity.ok((Object) TourResponse.from(saved));
        }).orElse(ResponseEntity.status(404).body(Map.of("error", "Tour not found")));
    }

    // Reaktiviraj turu (ARCHIVED → PUBLISHED)
    @PostMapping("/{id}/activate")
    public ResponseEntity<?> activateTour(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id) {

        Long authorId = jwtUtil.extractUserId(authHeader);
        if (authorId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }

        return tourRepository.findById(id).map(tour -> {
            if (!tour.getAuthorId().equals(authorId)) {
                return ResponseEntity.status(403).body(Map.of("error", "Forbidden"));
            }
            if (!"ARCHIVED".equals(tour.getStatus())) {
                return ResponseEntity.status(400).body(Map.of("error",
                        "Only archived tours can be activated"));
            }
            tour.setStatus("PUBLISHED");
            tour.setArchivedAt(null);
            return ResponseEntity.ok((Object) TourResponse.from(tourRepository.save(tour)));
        }).orElse(ResponseEntity.status(404).body(Map.of("error", "Tour not found")));
    }

    // ─── Trajanja ture ─────────────────────────────────────────────────────────

    @PostMapping("/{tourId}/durations")
    public ResponseEntity<?> addDuration(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long tourId,
            @Valid @RequestBody CreateTourDurationRequest req) {

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

        TourDuration td = new TourDuration();
        td.setTourId(tourId);
        td.setTransportType(req.getTransportType());
        td.setDurationInMinutes(req.getDurationInMinutes());

        return ResponseEntity.status(201).body(TourDurationResponse.from(tourDurationRepository.save(td)));
    }

    @GetMapping("/{tourId}/durations")
    public ResponseEntity<?> getDurations(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long tourId) {

        Long userId = jwtUtil.extractUserId(authHeader);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }

        List<TourDurationResponse> durations = tourDurationRepository.findByTourId(tourId)
                .stream().map(TourDurationResponse::from).collect(Collectors.toList());

        return ResponseEntity.ok(durations);
    }

    // ─── Ključne tačke ─────────────────────────────────────────────────────────

    @PostMapping("/{tourId}/keypoints")
    public ResponseEntity<?> addKeyPoint(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long tourId,
            @Valid @RequestBody CreateKeyPointRequest req) {

        Long authorId = jwtUtil.extractUserId(authHeader);
        if (authorId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }

        return tourRepository.findById(tourId).map(tour -> {
            if (!tour.getAuthorId().equals(authorId)) {
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

            // Recalculate length after adding
            recalculateLength(tour);

            return ResponseEntity.status(201).body((Object) KeyPointResponse.from(saved));
        }).orElse(ResponseEntity.status(404).body(Map.of("error", "Tour not found")));
    }

    @GetMapping("/{tourId}/keypoints")
    public ResponseEntity<?> getKeyPoints(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long tourId) {

        Long userId = jwtUtil.extractUserId(authHeader);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }

        String role = jwtUtil.extractRole(authHeader);
        boolean isTourist = "Tourist".equalsIgnoreCase(role);

        List<KeyPoint> kps = keyPointRepository.findByTourIdOrderById(tourId);

        if (isTourist && !hasPurchasedTour(userId, tourId, authHeader)) {
            // Turista koji nije kupio turu vidi samo prvu (početnu) tačku
            List<KeyPointResponse> startingPoint = kps.isEmpty()
                    ? List.of()
                    : List.of(KeyPointResponse.from(kps.get(0)));
            return ResponseEntity.ok(startingPoint);
        }

        return ResponseEntity.ok(kps.stream().map(KeyPointResponse::from).collect(Collectors.toList()));
    }

    private boolean hasPurchasedTour(Long touristId, Long tourId, String authHeader) {
        try {
            String url = purchaseServiceBaseUrl + "/purchases/purchase-tokens/check?tourId=" + tourId;
            java.net.http.HttpClient client = java.net.http.HttpClient.newHttpClient();
            java.net.http.HttpRequest request = java.net.http.HttpRequest.newBuilder()
                    .uri(java.net.URI.create(url))
                    .header("Authorization", authHeader)
                    .timeout(java.time.Duration.ofSeconds(3))
                    .build();
            java.net.http.HttpResponse<String> response = client.send(
                    request, java.net.http.HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                return mapper.readTree(response.body()).path("purchased").asBoolean(false);
            }
        } catch (Exception ignored) {
            // Ako purchase service nije dostupan, turista ne može vidjeti sve ključne tačke
        }
        return false;
    }

    @PutMapping("/{tourId}/keypoints/{keyPointId}")
    public ResponseEntity<?> updateKeyPoint(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long tourId,
            @PathVariable Long keyPointId,
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

        return keyPointRepository.findById(keyPointId).map(kp -> {
            kp.setName(req.getName());
            kp.setDescription(req.getDescription());
            kp.setImageUrl(req.getImageUrl());
            kp.setLatitude(req.getLatitude());
            kp.setLongitude(req.getLongitude());
            KeyPoint saved = keyPointRepository.save(kp);

            tourRepository.findById(tourId).ifPresent(this::recalculateLength);

            return ResponseEntity.ok((Object) KeyPointResponse.from(saved));
        }).orElse(ResponseEntity.status(404).body(Map.of("error", "Key point not found")));
    }

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

        tourRepository.findById(tourId).ifPresent(this::recalculateLength);

        return ResponseEntity.noContent().build();
    }

    // ─── Recenzije ─────────────────────────────────────────────────────────────

    @PostMapping("/{tourId}/reviews")
    public ResponseEntity<?> addReview(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long tourId,
            @Valid @RequestBody CreateReviewRequest req) {

        Long touristId = jwtUtil.extractUserId(authHeader);
        if (touristId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }

        if (!tourRepository.existsById(tourId)) {
            return ResponseEntity.status(404).body(Map.of("error", "Tour not found"));
        }

        boolean hasCompleted = tourExecutionRepository
                .findByTouristIdAndTourIdAndStatus(touristId, tourId, "COMPLETED").isPresent();
        if (!hasCompleted) {
            return ResponseEntity.status(403).body(Map.of("error",
                    "You can only review tours you have completed"));
        }

        if (reviewRepository.existsByTouristIdAndTourId(touristId, tourId)) {
            return ResponseEntity.status(409).body(Map.of("error",
                    "You have already reviewed this tour"));
        }

        Review review = new Review();
        review.setTourId(tourId);
        review.setTouristId(touristId);
        review.setTouristName(req.getTouristName());
        review.setRating(req.getRating());
        review.setComment(req.getComment());
        review.setVisitDate(req.getVisitDate());
        review.setCommentDate(java.time.LocalDateTime.now());
        review.setImages(req.getImages() != null ? req.getImages() : List.of());

        Review saved = reviewRepository.save(review);
        MDC.put("tourId", String.valueOf(tourId));
        MDC.put("userId", String.valueOf(touristId));
        MDC.put("action", "REVIEW_ADDED");
        log.info("Review added: rating={}", saved.getRating());
        MDC.clear();
        return ResponseEntity.status(201).body(ReviewResponse.from(saved));
    }

    @GetMapping("/{tourId}/reviews")
    public ResponseEntity<?> getReviews(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long tourId) {

        Long userId = jwtUtil.extractUserId(authHeader);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }

        List<ReviewResponse> reviews = reviewRepository
                .findByTourIdOrderByCommentDateDesc(tourId)
                .stream()
                .map(ReviewResponse::from)
                .collect(Collectors.toList());

        return ResponseEntity.ok(reviews);
    }

    // GET /tours/{tourId}/availability — SAGA Choreography: purchase-service poziva ovaj endpoint
    @GetMapping("/{tourId}/availability")
    public ResponseEntity<?> checkAvailability(@PathVariable Long tourId) {
        return tourRepository.findById(tourId)
                .map(tour -> {
                    boolean available = "PUBLISHED".equals(tour.getStatus());
                    String reason = available ? "Tour is available for purchase"
                                              : "Tour is not published (status: " + tour.getStatus() + ")";
                    return ResponseEntity.ok(Map.of("available", available, "reason", reason));
                })
                .orElse(ResponseEntity.ok(Map.of("available", false, "reason", "Tour not found")));
    }

    // ─── Helperi ───────────────────────────────────────────────────────────────

    private void recalculateLength(Tour tour) {
        List<KeyPoint> kps = keyPointRepository.findByTourIdOrderById(tour.getId());
        if (kps.size() >= 2) {
            try {
                String coords = kps.stream()
                        .map(kp -> kp.getLongitude() + "," + kp.getLatitude())
                        .collect(Collectors.joining(";"));
                String url = "https://router.project-osrm.org/route/v1/driving/" + coords + "?overview=false";

                java.net.http.HttpClient client = java.net.http.HttpClient.newHttpClient();
                java.net.http.HttpRequest request = java.net.http.HttpRequest.newBuilder()
                        .uri(java.net.URI.create(url))
                        .timeout(java.time.Duration.ofSeconds(5))
                        .build();
                java.net.http.HttpResponse<String> response = client.send(
                        request, java.net.http.HttpResponse.BodyHandlers.ofString());

                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                com.fasterxml.jackson.databind.JsonNode root = mapper.readTree(response.body());
                double meters = root.path("routes").get(0).path("distance").asDouble();
                tour.setLengthInKm(Math.round(meters / 10.0) / 100.0);
            } catch (Exception e) {
                tour.setLengthInKm(haversineTotalKm(kps));
            }
        } else {
            tour.setLengthInKm(null);
        }
        tourRepository.save(tour);
    }

    private double haversineTotalKm(List<KeyPoint> kps) {
        double total = 0;
        for (int i = 1; i < kps.size(); i++) {
            double lat1 = kps.get(i - 1).getLatitude(), lon1 = kps.get(i - 1).getLongitude();
            double lat2 = kps.get(i).getLatitude(),     lon2 = kps.get(i).getLongitude();
            double dLat = Math.toRadians(lat2 - lat1), dLon = Math.toRadians(lon2 - lon1);
            double a = Math.sin(dLat/2)*Math.sin(dLat/2)
                    + Math.cos(Math.toRadians(lat1))*Math.cos(Math.toRadians(lat2))
                    * Math.sin(dLon/2)*Math.sin(dLon/2);
            total += 6371.0 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        }
        return Math.round(total * 100.0) / 100.0;
    }

    private boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
