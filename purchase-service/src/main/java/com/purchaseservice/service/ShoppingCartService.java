package com.purchaseservice.service;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.purchaseservice.dto.AddToCartRequest;
import com.purchaseservice.dto.CartResponse;
import com.purchaseservice.dto.TourPurchaseTokenResponse;
import com.purchaseservice.model.OrderItem;
import com.purchaseservice.model.ShoppingCart;
import com.purchaseservice.model.TourPurchaseToken;
import com.purchaseservice.repository.ShoppingCartRepository;
import com.purchaseservice.repository.TourPurchaseTokenRepository;

@Service
public class ShoppingCartService {

    private final ShoppingCartRepository cartRepository;
    private final TourPurchaseTokenRepository tokenRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${tour.service.base-url:http://tour-service:8080}")
    private String tourServiceBaseUrl;

    public ShoppingCartService(ShoppingCartRepository cartRepository,
                               TourPurchaseTokenRepository tokenRepository) {
        this.cartRepository  = cartRepository;
        this.tokenRepository = tokenRepository;
    }

    @Transactional
    public CartResponse getCart(Long touristId) {
        ShoppingCart cart = getOrCreateCart(touristId);
        return CartResponse.from(cart);
    }

    @Transactional
    public CartResponse addItem(Long touristId, AddToCartRequest req, String authHeader) {
        verifyTourPublished(req.getTourId(), authHeader);

        ShoppingCart cart = getOrCreateCart(touristId);

        boolean alreadyInCart = cart.getItems().stream()
                .anyMatch(i -> i.getTourId().equals(req.getTourId()));
        if (alreadyInCart) {
            throw new IllegalStateException("Tour is already in the cart");
        }

        OrderItem item = new OrderItem();
        item.setCart(cart);
        item.setTourId(req.getTourId());
        item.setTourName(req.getTourName());
        item.setPrice(req.getPrice());
        cart.getItems().add(item);

        recalculate(cart);
        return CartResponse.from(cartRepository.save(cart));
    }

    @Transactional
    public CartResponse removeItem(Long touristId, Long tourId) {
        ShoppingCart cart = cartRepository.findByTouristId(touristId)
                .orElseThrow(() -> new IllegalStateException("Cart not found"));

        boolean removed = cart.getItems().removeIf(i -> i.getTourId().equals(tourId));
        if (!removed) {
            throw new IllegalArgumentException("Tour not found in cart");
        }

        recalculate(cart);
        return CartResponse.from(cartRepository.save(cart));
    }

    @Transactional
    public List<TourPurchaseTokenResponse> checkout(Long touristId) {
        ShoppingCart cart = cartRepository.findByTouristId(touristId)
                .orElseThrow(() -> new IllegalStateException("Cart not found"));

        if (cart.getItems().isEmpty()) {
            throw new IllegalStateException("Cart is empty");
        }

        List<TourPurchaseToken> tokens = cart.getItems().stream()
                .map(item -> tokenRepository.findByTouristIdAndTourId(touristId, item.getTourId())
                        .orElseGet(() -> {
                            TourPurchaseToken t = new TourPurchaseToken();
                            t.setTouristId(touristId);
                            t.setTourId(item.getTourId());
                            t.setTourName(item.getTourName());
                            t.setToken(UUID.randomUUID().toString());
                            t.setPurchasedAt(LocalDateTime.now());
                            return tokenRepository.save(t);
                        }))
                .collect(Collectors.toList());

        cart.getItems().clear();
        recalculate(cart);
        cartRepository.save(cart);

        return tokens.stream().map(TourPurchaseTokenResponse::from).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public boolean hasPurchased(Long touristId, Long tourId) {
        return tokenRepository.existsByTouristIdAndTourId(touristId, tourId);
    }

    @Transactional(readOnly = true)
    public List<TourPurchaseTokenResponse> getTokens(Long touristId) {
        return tokenRepository.findByTouristId(touristId).stream()
                .map(TourPurchaseTokenResponse::from)
                .collect(Collectors.toList());
    }

    // ─── Helpers ───────────────────────────────────────────────────────────────

    private ShoppingCart getOrCreateCart(Long touristId) {
        return cartRepository.findByTouristId(touristId)
                .orElseGet(() -> {
                    ShoppingCart cart = new ShoppingCart();
                    cart.setTouristId(touristId);
                    return cartRepository.save(cart);
                });
    }

    private void recalculate(ShoppingCart cart) {
        BigDecimal total = cart.getItems().stream()
                .map(OrderItem::getPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        cart.setTotalPrice(total);
    }

    private void verifyTourPublished(Long tourId, String authHeader) {
        try {
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(tourServiceBaseUrl + "/tours/" + tourId))
                    .header("Authorization", authHeader)
                    .timeout(Duration.ofSeconds(5))
                    .GET()
                    .build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 404) {
                throw new IllegalArgumentException("Tour not found or not available for purchase");
            }
            if (response.statusCode() != 200) {
                throw new RuntimeException("Tour service unavailable (status " + response.statusCode() + ")");
            }

            String status = objectMapper.readTree(response.body()).path("status").asText("");
            if ("ARCHIVED".equals(status)) {
                throw new IllegalArgumentException("Archived tours cannot be purchased");
            }
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Tour service unavailable: " + e.getMessage());
        }
    }
}
