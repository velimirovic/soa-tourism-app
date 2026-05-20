-- ============================================================
-- V3 — Tokeni kupovine tura
-- ============================================================

CREATE TABLE tour_purchase_tokens (
    id           BIGSERIAL    PRIMARY KEY,
    tourist_id   BIGINT       NOT NULL,
    tour_id      BIGINT       NOT NULL,
    tour_name    VARCHAR(255) NOT NULL,
    token        VARCHAR(36)  NOT NULL UNIQUE,
    purchased_at TIMESTAMP    NOT NULL,
    UNIQUE (tourist_id, tour_id)
);
