package com.purchaseservice.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

import com.purchaseservice.model.ShoppingCart;

public class CartResponse {

    private Long id;
    private Long touristId;
    private List<OrderItemResponse> items;
    private BigDecimal totalPrice;

    public static CartResponse from(ShoppingCart cart) {
        CartResponse r = new CartResponse();
        r.id         = cart.getId();
        r.touristId  = cart.getTouristId();
        r.totalPrice = cart.getTotalPrice();
        r.items      = cart.getItems().stream()
                           .map(OrderItemResponse::from)
                           .collect(Collectors.toList());
        return r;
    }

    public Long getId()                        { return id; }
    public Long getTouristId()                 { return touristId; }
    public List<OrderItemResponse> getItems()  { return items; }
    public BigDecimal getTotalPrice()          { return totalPrice; }
}
