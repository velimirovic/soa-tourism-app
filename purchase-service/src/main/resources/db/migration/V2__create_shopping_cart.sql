-- ============================================================
-- V2 — Korpa za kupovinu i stavke
-- ============================================================

CREATE TABLE shopping_carts (
    id          BIGSERIAL PRIMARY KEY,
    tourist_id  BIGINT    NOT NULL UNIQUE,
    total_price NUMERIC(38, 2) NOT NULL DEFAULT 0
);

CREATE TABLE order_items (
    id        BIGSERIAL PRIMARY KEY,
    cart_id   BIGINT        NOT NULL REFERENCES shopping_carts(id) ON DELETE CASCADE,
    tour_id   BIGINT        NOT NULL,
    tour_name VARCHAR(255)  NOT NULL,
    price     NUMERIC(38, 2) NOT NULL,
    UNIQUE (cart_id, tour_id)
);
