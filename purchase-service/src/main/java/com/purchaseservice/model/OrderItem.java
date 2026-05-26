package com.purchaseservice.model;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "order_items",
       uniqueConstraints = @UniqueConstraint(columnNames = {"cart_id", "tour_id"}))
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cart_id", nullable = false)
    private ShoppingCart cart;

    @Column(name = "tour_id", nullable = false)
    private Long tourId;

    @Column(name = "tour_name", nullable = false)
    private String tourName;

    @Column(nullable = false, precision = 38, scale = 2)
    private BigDecimal price;

    public Long getId()             { return id; }
    public ShoppingCart getCart()   { return cart; }
    public Long getTourId()         { return tourId; }
    public String getTourName()     { return tourName; }
    public BigDecimal getPrice()    { return price; }

    public void setCart(ShoppingCart cart)   { this.cart = cart; }
    public void setTourId(Long tourId)       { this.tourId = tourId; }
    public void setTourName(String tourName) { this.tourName = tourName; }
    public void setPrice(BigDecimal price)   { this.price = price; }
}
