# ── Build stage ───────────────────────────────────────────────
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Skip checksum DB so go can fetch and verify dependencies freely
ENV GONOSUMCHECK=*
ENV GOFLAGS=-mod=mod

# Copy only go.mod first for better layer caching
COPY go.mod ./
RUN go mod download

# Copy source and build a static binary
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o gateway .

# ── Runtime stage ──────────────────────────────────────────────
FROM alpine:3.19

RUN apk --no-cache add ca-certificates tzdata

WORKDIR /root/

COPY --from=builder /app/gateway .

EXPOSE 8080

CMD ["./gateway"]
