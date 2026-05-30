package com.tourservice.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.tourservice.dto.TourExecutionResponse;
import com.tourservice.service.TourExecutionService;
import com.tourservice.util.JwtUtil;

@RestController
@RequestMapping("/tours/executions")
public class TourExecutionController {

    private final TourExecutionService executionService;
    private final JwtUtil jwtUtil;

    public TourExecutionController(TourExecutionService executionService, JwtUtil jwtUtil) {
        this.executionService = executionService;
        this.jwtUtil          = jwtUtil;
    }

    @GetMapping("/completed-tour-ids")
    public ResponseEntity<?> completedTourIds(
            @RequestHeader("Authorization") String authHeader) {

        Long touristId = jwtUtil.extractUserId(authHeader);
        if (touristId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }

        return ResponseEntity.ok(executionService.getCompletedTourIds(touristId));
    }

    @GetMapping("/has-completed")
    public ResponseEntity<?> hasCompleted(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam Long tourId) {

        Long touristId = jwtUtil.extractUserId(authHeader);
        if (touristId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }

        return ResponseEntity.ok(Map.of("hasCompleted", executionService.hasCompletedTour(touristId, tourId)));
    }

    @GetMapping("/active")
    public ResponseEntity<?> getActive(
            @RequestHeader("Authorization") String authHeader) {

        Long touristId = jwtUtil.extractUserId(authHeader);
        if (touristId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }

        return executionService.getActiveExecution(touristId)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    @PutMapping("/{id}/complete")
    public ResponseEntity<?> complete(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id) {

        Long touristId = jwtUtil.extractUserId(authHeader);
        if (touristId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }

        TourExecutionResponse resp = executionService.completeTour(id, touristId);
        return ResponseEntity.ok(resp);
    }

    @PutMapping("/{id}/abandon")
    public ResponseEntity<?> abandon(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id) {

        Long touristId = jwtUtil.extractUserId(authHeader);
        if (touristId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }

        TourExecutionResponse resp = executionService.abandonTour(id, touristId);
        return ResponseEntity.ok(resp);
    }
}
