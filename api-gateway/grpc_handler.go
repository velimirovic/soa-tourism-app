package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	pb "api-gateway/proto"

	"github.com/golang-jwt/jwt/v5"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/encoding/protojson"
)

type grpcHandlers struct {
	client pb.TourExecutionServiceClient
}

func newGrpcHandlers(grpcAddr string) (*grpcHandlers, error) {
	conn, err := grpc.Dial(grpcAddr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		return nil, err
	}
	return &grpcHandlers{client: pb.NewTourExecutionServiceClient(conn)}, nil
}

// extractUserID parses the JWT and returns the "sub" claim as int64
func extractUserID(authHeader string) (int64, error) {
	tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return jwtKey, nil
	})
	if err != nil || !token.Valid {
		return 0, fmt.Errorf("invalid token")
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return 0, fmt.Errorf("invalid claims")
	}
	sub := fmt.Sprintf("%v", claims["sub"])
	return strconv.ParseInt(sub, 10, 64)
}

// POST /api/tours/executions
func (h *grpcHandlers) handleStartTour(w http.ResponseWriter, r *http.Request) {
	authHeader := r.Header.Get("Authorization")
	touristID, err := extractUserID(authHeader)
	if err != nil {
		http.Error(w, `{"error":"Unauthorized"}`, http.StatusUnauthorized)
		return
	}

	var body struct {
		TourID    int64   `json:"tourId"`
		Latitude  float64 `json:"latitude"`
		Longitude float64 `json:"longitude"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"Invalid request body"}`, http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	resp, err := h.client.StartTour(ctx, &pb.StartTourRequest{
		TourId:    body.TourID,
		TouristId: touristID,
		Latitude:  body.Latitude,
		Longitude: body.Longitude,
		AuthToken: authHeader,
	})
	if err != nil {
		writeGrpcError(w, err)
		return
	}

	marshaler := protojson.MarshalOptions{EmitUnpopulated: true, UseProtoNames: false}
	data, _ := marshaler.Marshal(resp)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	w.Write(data)
}

// POST /api/tours/executions/{id}/check-position
func (h *grpcHandlers) handleCheckPosition(w http.ResponseWriter, r *http.Request, executionIDStr string) {
	executionID, err := strconv.ParseInt(executionIDStr, 10, 64)
	if err != nil {
		http.Error(w, `{"error":"Invalid execution ID"}`, http.StatusBadRequest)
		return
	}

	var body struct {
		Latitude  float64 `json:"latitude"`
		Longitude float64 `json:"longitude"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"Invalid request body"}`, http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	resp, err := h.client.CheckPosition(ctx, &pb.CheckPositionRequest{
		ExecutionId: executionID,
		Latitude:    body.Latitude,
		Longitude:   body.Longitude,
	})
	if err != nil {
		writeGrpcError(w, err)
		return
	}

	marshaler := protojson.MarshalOptions{EmitUnpopulated: true, UseProtoNames: false}
	data, _ := marshaler.Marshal(resp)
	w.Header().Set("Content-Type", "application/json")
	w.Write(data)
}

func writeGrpcError(w http.ResponseWriter, err error) {
	st, _ := status.FromError(err)
	httpStatus := grpcCodeToHTTP(st.Code())
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(httpStatus)
	json.NewEncoder(w).Encode(map[string]string{"error": st.Message()})
}

func grpcCodeToHTTP(code codes.Code) int {
	switch code {
	case codes.NotFound:
		return http.StatusNotFound
	case codes.AlreadyExists:
		return http.StatusConflict
	case codes.InvalidArgument:
		return http.StatusBadRequest
	case codes.PermissionDenied:
		return http.StatusForbidden
	case codes.Unauthenticated:
		return http.StatusUnauthorized
	case codes.Unavailable:
		return http.StatusServiceUnavailable
	default:
		return http.StatusInternalServerError
	}
}
