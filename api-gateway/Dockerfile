# ── Build stage ───────────────────────────────────────────────
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Install protoc and protobuf dev headers
RUN apk add --no-cache protobuf protobuf-dev

ENV GONOSUMCHECK=*
ENV GOFLAGS=-mod=mod
ENV GOPATH=/go
ENV PATH=$GOPATH/bin:$PATH

# Copy go.mod and go.sum first for better layer caching
COPY go.mod go.sum ./
RUN go mod download

# Install protoc plugins:
#   protoc-gen-go        — generates Go structs from .proto messages
#   protoc-gen-go-grpc   — generates Go gRPC stubs
#   protoc-gen-grpc-gateway — generates HTTP/JSON → gRPC transcoding layer
RUN go install google.golang.org/protobuf/cmd/protoc-gen-go@v1.33.0 && \
    go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@v1.3.0 && \
    go install github.com/grpc-ecosystem/grpc-gateway/v2/protoc-gen-grpc-gateway@v2.19.1

# Copy source
COPY . .

# Generate gRPC stubs and grpc-gateway transcoding layer from proto definitions.
# -I./proto makes google/api/*.proto available for import resolution.
RUN mkdir -p proto && \
    protoc \
      -I. \
      -I./proto \
      -I/usr/include \
      --go_out=. --go_opt=paths=source_relative \
      --go-grpc_out=. --go-grpc_opt=paths=source_relative \
      --grpc-gateway_out=. --grpc-gateway_opt=paths=source_relative \
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
