# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /app

RUN apk add --no-cache protobuf protobuf-dev

RUN go install google.golang.org/protobuf/cmd/protoc-gen-go@v1.34.1 && \
    go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@v1.3.0

ENV GONOSUMCHECK=*
ENV GOFLAGS=-mod=mod
ENV GOPATH=/go
ENV PATH=$GOPATH/bin:$PATH

COPY go.mod ./
RUN go mod download

COPY . .

RUN protoc -I . \
    --go_out=paths=source_relative:. \
    --go-grpc_out=paths=source_relative:. \
    proto/followers/followers.proto

RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o followers-service .

# Runtime stage
FROM alpine:3.19

RUN apk --no-cache add ca-certificates tzdata

WORKDIR /root/

COPY --from=builder /app/followers-service .

EXPOSE 8084
EXPOSE 9091

CMD ["./followers-service"]
