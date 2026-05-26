package com.purchaseservice.dto;

import java.math.BigDecimal;

import com.purchaseservice.model.OrderItem;

public class OrderItemResponse {

    private Long id;
    private Long tourId;
    private String tourName;
    private BigDecimal price;

    public static OrderItemResponse from(OrderItem item) {
        OrderItemResponse r = new OrderItemResponse();
        r.id       = item.getId();
        r.tourId   = item.getTourId();
        r.tourName = item.getTourName();
        r.price    = item.getPrice();
        return r;
    }

    public Long getId()            { return id; }
    public Long getTourId()        { return tourId; }
    public String getTourName()    { return tourName; }
    public BigDecimal getPrice()   { return price; }
}
