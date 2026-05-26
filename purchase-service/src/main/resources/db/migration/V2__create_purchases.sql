CREATE TABLE purchases (
    id          bigserial       PRIMARY KEY,
    tour_id     bigint          NOT NULL,
    tourist_id  bigint          NOT NULL,
    status      varchar(20)     NOT NULL DEFAULT 'PENDING',
    created_at  timestamp       NOT NULL DEFAULT now(),
    updated_at  timestamp       NOT NULL DEFAULT now()
);
