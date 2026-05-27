# ── Build stage ───────────────────────────────────────────────
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Install protoc and protoc plugins for gRPC stub generation
RUN apk add --no-cache protobuf protobuf-dev

ENV GONOSUMCHECK=*
ENV GOFLAGS=-mod=mod
ENV GOPATH=/go
ENV PATH=$GOPATH/bin:$PATH

# Copy go.mod first for better layer caching
COPY go.mod ./
RUN go mod download

# Install protoc-gen-go and protoc-gen-go-grpc
RUN go install google.golang.org/protobuf/cmd/protoc-gen-go@v1.33.0 && \
    go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@v1.3.0

# Copy source
COPY . .

# Generate gRPC stubs from proto file
RUN mkdir -p proto && \
    protoc \
      --go_out=. --go_opt=paths=source_relative \
      --go-grpc_out=. --go-grpc_opt=paths=source_relative \
      proto/tour_execution.proto

# Build static binary
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o gateway .

# ── Runtime stage ──────────────────────────────────────────────
FROM alpine:3.19

RUN apk --no-cache add ca-certificates tzdata

WORKDIR /root/

COPY --from=builder /app/gateway .

EXPOSE 8080

CMD ["./gateway"]
