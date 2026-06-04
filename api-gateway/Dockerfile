# ── Build stage ───────────────────────────────────────────────
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Install protoc and protobuf dev headers
RUN apk add --no-cache protobuf protobuf-dev

# Install protoc-gen-go, protoc-gen-go-grpc and protoc-gen-grpc-gateway
RUN go install google.golang.org/protobuf/cmd/protoc-gen-go@v1.34.1 && \
    go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@v1.3.0 && \
    go install github.com/grpc-ecosystem/grpc-gateway/v2/protoc-gen-grpc-gateway@v2.19.1


ENV GONOSUMCHECK=*
ENV GOFLAGS=-mod=mod
ENV GOPATH=/go
ENV PATH=$GOPATH/bin:$PATH

COPY go.mod ./
RUN go mod download

COPY . .

# Generate Go stubs from proto definitions
RUN protoc -I . \
    --go_out=paths=source_relative:. \
    --go-grpc_out=paths=source_relative:. \
    proto/review/review.proto

RUN protoc -I . \
    --go_out=paths=source_relative:. \
    --go-grpc_out=paths=source_relative:. \
    proto/position/position.proto

RUN protoc -I . \
    -I ./proto \
    --go_out=paths=source_relative:. \
    --go-grpc_out=paths=source_relative:. \
    --grpc-gateway_out=paths=source_relative:. \
    proto/tour_execution.proto

RUN protoc -I . \
    --go_out=paths=source_relative:. \
    --go-grpc_out=paths=source_relative:. \
    proto/blog/blog.proto

RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o gateway .

# ── Runtime stage ──────────────────────────────────────────────
FROM alpine:3.19

RUN apk --no-cache add ca-certificates tzdata

WORKDIR /root/

COPY --from=builder /app/gateway .

EXPOSE 8080

CMD ["./gateway"]
