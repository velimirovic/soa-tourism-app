package com.purchaseservice.model;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

@Entity
@Table(name = "shopping_carts")
public class ShoppingCart {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tourist_id", nullable = false, unique = true)
    private Long touristId;

    @OneToMany(mappedBy = "cart", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItem> items = new ArrayList<>();

    @Column(name = "total_price", precision = 38, scale = 2, nullable = false)
    private BigDecimal totalPrice = BigDecimal.ZERO;

    public Long getId()                   { return id; }
    public Long getTouristId()            { return touristId; }
    public List<OrderItem> getItems()     { return items; }
    public BigDecimal getTotalPrice()     { return totalPrice; }

    public void setTouristId(Long touristId)       { this.touristId = touristId; }
    public void setItems(List<OrderItem> items)    { this.items = items; }
    public void setTotalPrice(BigDecimal totalPrice) { this.totalPrice = totalPrice; }
}
