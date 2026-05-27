package com.tourservice.service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tourservice.dto.CheckPositionResponse;
import com.tourservice.dto.CompletedKeyPointResponse;
import com.tourservice.dto.TourExecutionResponse;
import com.tourservice.model.CompletedKeyPoint;
import com.tourservice.model.KeyPoint;
import com.tourservice.model.Tour;
import com.tourservice.model.TourExecution;
import com.tourservice.repository.CompletedKeyPointRepository;
import com.tourservice.repository.KeyPointRepository;
import com.tourservice.repository.TourExecutionRepository;
import com.tourservice.repository.TourRepository;

@Service
public class TourExecutionService {

    private static final double PROXIMITY_THRESHOLD_METERS = 50.0;
    private static final double EARTH_RADIUS_M = 6_371_000.0;

    @Value("${purchase.service.base-url:http://purchase-service:8080}")
    private String purchaseServiceBaseUrl;

    private final TourRepository tourRepository;
    private final KeyPointRepository keyPointRepository;
    private final TourExecutionRepository executionRepository;
    private final CompletedKeyPointRepository completedKeyPointRepository;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public TourExecutionService(TourRepository tourRepository,
                                KeyPointRepository keyPointRepository,
                                TourExecutionRepository executionRepository,
                                CompletedKeyPointRepository completedKeyPointRepository) {
        this.tourRepository             = tourRepository;
        this.keyPointRepository         = keyPointRepository;
        this.executionRepository        = executionRepository;
        this.completedKeyPointRepository = completedKeyPointRepository;
    }

    public TourExecutionResponse startTour(Long touristId, Long tourId,
                                           Double lat, Double lng, String authToken) {
        Tour tour = tourRepository.findById(tourId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tour not found"));

        if (!"PUBLISHED".equals(tour.getStatus()) && !"ARCHIVED".equals(tour.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Tour must be published or archived to start");
        }

        if (executionRepository.findByTouristIdAndStatus(touristId, "ACTIVE").isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "You already have an active tour execution");
        }

        checkPurchased(touristId, tourId, authToken);

        LocalDateTime now = LocalDateTime.now();
        TourExecution execution = new TourExecution();
        execution.setTouristId(touristId);
        execution.setTourId(tourId);
        execution.setStatus("ACTIVE");
        execution.setStartedAt(now);
        execution.setLastActivity(now);
        execution.setStartLatitude(lat);
        execution.setStartLongitude(lng);
        execution = executionRepository.save(execution);

        return TourExecutionResponse.from(execution, List.of());
    }

    public TourExecutionResponse completeTour(Long executionId, Long touristId) {
        TourExecution execution = getOwnedActiveExecution(executionId, touristId);
        LocalDateTime now = LocalDateTime.now();
        execution.setStatus("COMPLETED");
        execution.setEndedAt(now);
        execution.setLastActivity(now);
        execution = executionRepository.save(execution);
        List<CompletedKeyPoint> completed = completedKeyPointRepository.findByExecutionId(executionId);
        return TourExecutionResponse.from(execution, completed);
    }

    public TourExecutionResponse abandonTour(Long executionId, Long touristId) {
        TourExecution execution = getOwnedActiveExecution(executionId, touristId);
        LocalDateTime now = LocalDateTime.now();
        execution.setStatus("ABANDONED");
        execution.setEndedAt(now);
        execution.setLastActivity(now);
        execution = executionRepository.save(execution);
        List<CompletedKeyPoint> completed = completedKeyPointRepository.findByExecutionId(executionId);
        return TourExecutionResponse.from(execution, completed);
    }

    public CheckPositionResponse checkPosition(Long executionId, Long touristId,
                                               Double lat, Double lng) {
        TourExecution execution = getOwnedActiveExecution(executionId, touristId);
        execution.setLastActivity(LocalDateTime.now());

        List<KeyPoint> keyPoints = keyPointRepository.findByTourIdOrderById(execution.getTourId());
        List<CompletedKeyPoint> alreadyCompleted =
                completedKeyPointRepository.findByExecutionId(executionId);

        Set<Long> completedIds = alreadyCompleted.stream()
                .map(CompletedKeyPoint::getKeyPointId)
                .collect(Collectors.toSet());

        List<CompletedKeyPoint> newlyCompleted = new ArrayList<>();
        for (KeyPoint kp : keyPoints) {
            if (!completedIds.contains(kp.getId())) {
                double dist = distanceMeters(lat, lng, kp.getLatitude(), kp.getLongitude());
                if (dist <= PROXIMITY_THRESHOLD_METERS) {
                    CompletedKeyPoint ckp = new CompletedKeyPoint();
                    ckp.setExecutionId(executionId);
                    ckp.setKeyPointId(kp.getId());
                    ckp.setCompletedAt(LocalDateTime.now());
                    newlyCompleted.add(completedKeyPointRepository.save(ckp));
                    completedIds.add(kp.getId());
                }
            }
        }

        executionRepository.save(execution);

        boolean tourCompleted = !keyPoints.isEmpty() && completedIds.size() >= keyPoints.size();

        List<CompletedKeyPoint> allCompleted = new ArrayList<>(alreadyCompleted);
        allCompleted.addAll(newlyCompleted);

        return new CheckPositionResponse(
                executionId,
                newlyCompleted.stream().map(CompletedKeyPointResponse::from).collect(Collectors.toList()),
                allCompleted.stream().map(CompletedKeyPointResponse::from).collect(Collectors.toList()),
                tourCompleted
        );
    }

    // gRPC path: no tourist ownership check (gateway already validated JWT)
    public CheckPositionResponse checkPositionByExecutionId(Long executionId,
                                                            Double lat, Double lng) {
        TourExecution execution = executionRepository.findById(executionId)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Execution not found"));
        if (!"ACTIVE".equals(execution.getStatus())) {
            throw new org.springframework.web.server.ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Execution is not active");
        }
        return checkPosition(executionId, execution.getTouristId(), lat, lng);
    }

    public List<Long> getCompletedTourIds(Long touristId) {
        return executionRepository.findAllByTouristIdAndStatus(touristId, "COMPLETED")
                .stream()
                .map(TourExecution::getTourId)
                .distinct()
                .collect(Collectors.toList());
    }

    public boolean hasCompletedTour(Long touristId, Long tourId) {
        return executionRepository.findByTouristIdAndTourIdAndStatus(touristId, tourId, "COMPLETED").isPresent();
    }

    public Optional<TourExecutionResponse> getActiveExecution(Long touristId) {
        return executionRepository.findByTouristIdAndStatus(touristId, "ACTIVE")
                .map(ex -> {
                    List<CompletedKeyPoint> completed =
                            completedKeyPointRepository.findByExecutionId(ex.getId());
                    return TourExecutionResponse.from(ex, completed);
                });
    }

    // ── Helpers ─────────────────────────────────────────────────────────────────

    private TourExecution getOwnedActiveExecution(Long executionId, Long touristId) {
        TourExecution execution = executionRepository.findById(executionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Execution not found"));
        if (!execution.getTouristId().equals(touristId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
        }
        if (!"ACTIVE".equals(execution.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Execution is not active");
        }
        return execution;
    }

    private void checkPurchased(Long touristId, Long tourId, String authToken) {
        try {
            String url = purchaseServiceBaseUrl + "/purchases/purchase-tokens/check?tourId=" + tourId;
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Authorization", authToken)
                    .GET()
                    .timeout(Duration.ofSeconds(5))
                    .build();
            HttpResponse<String> response =
                    httpClient.send(req, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                        "Purchase service unavailable");
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> body = objectMapper.readValue(response.body(), Map.class);
            Boolean purchased = (Boolean) body.get("purchased");
            if (!Boolean.TRUE.equals(purchased)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Tour must be purchased before starting");
            }
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Could not verify purchase: " + e.getMessage());
        }
    }

    private double distanceMeters(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                 + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                 * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return EARTH_RADIUS_M * c;
    }
}
