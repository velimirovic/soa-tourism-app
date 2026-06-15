package com.tourservice.listener;

import com.tourservice.config.RabbitMQConfig;
import com.tourservice.repository.TourRepository;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.util.Map;

// SAGA: Choreography — odgovara na zahtjeve purchase-service-a o dostupnosti ture
@Component
public class TourAvailabilityListener {

    private final TourRepository tourRepository;

    public TourAvailabilityListener(TourRepository tourRepository) {
        this.tourRepository = tourRepository;
    }

    @RabbitListener(queues = RabbitMQConfig.TOUR_AVAILABILITY_QUEUE)
    public Map<String, Object> checkAvailability(Map<String, Object> message) {
        Long tourId = ((Number) message.get("tourId")).longValue();
        boolean available = tourRepository.findById(tourId)
                .map(t -> "PUBLISHED".equals(t.getStatus()))
                .orElse(false);
        return Map.of("available", available);
    }
}
