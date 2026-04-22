# Build stage 
FROM golang:1.21-alpine AS builder

WORKDIR /app

ENV GONOSUMCHECK=*
ENV GOFLAGS=-mod=mod

COPY go.mod ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o followers-service .

# Runtime stage
FROM alpine:3.19

RUN apk --no-cache add ca-certificates tzdata

WORKDIR /root/

COPY --from=builder /app/followers-service .

EXPOSE 8084

CMD ["./followers-service"]
