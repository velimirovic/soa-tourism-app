package main

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
	pb "api-gateway/proto"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/protobuf/encoding/protojson"
)

// newGatewayMux creates a grpc-gateway ServeMux that transcodes HTTP/JSON requests
// to gRPC calls on the tour-service, following the grpc-gateway pattern.
func newGatewayMux(ctx context.Context, grpcAddr string) (*runtime.ServeMux, error) {
	conn, err := grpc.DialContext(ctx, grpcAddr,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	if err != nil {
		return nil, err
	}
	go func() { <-ctx.Done(); conn.Close() }()

	client := pb.NewTourExecutionServiceClient(conn)

	marshaler := &runtime.JSONPb{
		MarshalOptions: protojson.MarshalOptions{
			EmitUnpopulated: true,
			UseProtoNames:   false,
		},
	}

	gwMux := runtime.NewServeMux(
		runtime.WithMarshalerOption(runtime.MIMEWildcard, marshaler),
	)

	// POST /tours/executions → StartTour
	// tourist_id is extracted from the JWT by the gateway and injected into the
	// gRPC request, so it is never sent by the client (security requirement).
	if err := gwMux.HandlePath("POST", "/tours/executions",
		func(w http.ResponseWriter, r *http.Request, _ map[string]string) {
			touristID, err := extractUserID(r.Header.Get("Authorization"))
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

			resp, err := client.StartTour(r.Context(), &pb.StartTourRequest{
				TourId:    body.TourID,
				TouristId: touristID,
				Latitude:  body.Latitude,
				Longitude: body.Longitude,
				AuthToken: r.Header.Get("Authorization"),
			})
			if err != nil {
				writeGrpcError(w, err)
				return
			}

			data, _ := protojson.MarshalOptions{
				EmitUnpopulated: true,
				UseProtoNames:   false,
			}.Marshal(resp)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusCreated)
			w.Write(data)
		},
	); err != nil {
		return nil, err
	}

	// POST /tours/executions/{execution_id}/check-position → CheckPosition
	if err := gwMux.HandlePath("POST", "/tours/executions/{execution_id}/check-position",
		func(w http.ResponseWriter, r *http.Request, pathParams map[string]string) {
			executionID, err := strconv.ParseInt(pathParams["execution_id"], 10, 64)
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

			resp, err := client.CheckPosition(r.Context(), &pb.CheckPositionRequest{
				ExecutionId: executionID,
				Latitude:    body.Latitude,
				Longitude:   body.Longitude,
			})
			if err != nil {
				writeGrpcError(w, err)
				return
			}

			data, _ := protojson.MarshalOptions{
				EmitUnpopulated: true,
				UseProtoNames:   false,
			}.Marshal(resp)
			w.Header().Set("Content-Type", "application/json")
			w.Write(data)
		},
	); err != nil {
		return nil, err
	}

	return gwMux, nil
}
