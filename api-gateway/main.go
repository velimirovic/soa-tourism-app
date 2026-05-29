package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	positionpb "api-gateway/proto/position"
	reviewpb "api-gateway/proto/review"
)

var jwtKey []byte

var publicPaths = []string{
	"/auth/register",
	"/auth/login",
	"/health",
}

func isPublicPath(path string) bool {
	stripped := strings.TrimPrefix(path, "/api")
	for _, p := range publicPaths {
		if stripped == p || strings.HasPrefix(stripped, p+"/") {
			return true
		}
	}
	return false
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func jwtMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if isPublicPath(r.URL.Path) {
			next.ServeHTTP(w, r)
			return
		}

		authHeader := r.Header.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			http.Error(w, `{"error":"Neautorizovan pristup: nedostaje token"}`, http.StatusUnauthorized)
			return
		}

		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return jwtKey, nil
		})

		if err != nil || !token.Valid {
			http.Error(w, `{"error":"Neautorizovan pristup: neispravan token"}`, http.StatusUnauthorized)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func newReverseProxy(target string) http.Handler {
	targetURL, err := url.Parse(target)
	if err != nil {
		log.Fatalf("Neispravan URL servisa %s: %v", target, err)
	}

	proxy := httputil.NewSingleHostReverseProxy(targetURL)

	originalDirector := proxy.Director
	proxy.Director = func(req *http.Request) {
		originalDirector(req)
		req.URL.Path = strings.TrimPrefix(req.URL.Path, "/api")
		if req.URL.RawPath != "" {
			req.URL.RawPath = strings.TrimPrefix(req.URL.RawPath, "/api")
		}
		req.Host = targetURL.Host
	}

	proxy.ErrorHandler = func(w http.ResponseWriter, r *http.Request, err error) {
		log.Printf("Greška proxy-ja za %s: %v", r.URL.Path, err)
		http.Error(w, `{"error":"Servis nije dostupan"}`, http.StatusBadGateway)
	}

	return proxy
}

// extractUserID parsira JWT token i vraća user ID iz "sub" claim-a
func extractUserID(r *http.Request) (int64, error) {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
		return 0, fmt.Errorf("missing token")
	}
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
	sub, ok := claims["sub"]
	if !ok {
		return 0, fmt.Errorf("missing sub claim")
	}
	id, err := strconv.ParseInt(fmt.Sprintf("%v", sub), 10, 64)
	if err != nil {
		return 0, fmt.Errorf("invalid sub claim")
	}
	return id, nil
}

// ── tourHandler: POST /api/tours/{id}/reviews → gRPC, ostalo → HTTP proxy ──

type tourHandler struct {
	proxy        http.Handler
	reviewClient reviewpb.ReviewServiceClient
}

func (h *tourHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Ukloni /api/tours/ prefiks i podijeli putanju
	path := strings.TrimPrefix(r.URL.Path, "/api/tours/")
	parts := strings.Split(strings.Trim(path, "/"), "/")

	// POST /api/tours/{tourId}/reviews
	if r.Method == http.MethodPost && len(parts) == 2 && parts[1] == "reviews" {
		tourID, err := strconv.ParseInt(parts[0], 10, 64)
		if err != nil {
			http.Error(w, `{"error":"Invalid tour ID"}`, http.StatusBadRequest)
			return
		}
		h.handleCreateReview(w, r, tourID)
		return
	}

	h.proxy.ServeHTTP(w, r)
}

func (h *tourHandler) handleCreateReview(w http.ResponseWriter, r *http.Request, tourID int64) {
	touristID, err := extractUserID(r)
	if err != nil {
		http.Error(w, `{"error":"Unauthorized"}`, http.StatusUnauthorized)
		return
	}

	var body struct {
		Rating      int      `json:"rating"`
		Comment     string   `json:"comment"`
		TouristName string   `json:"touristName"`
		VisitDate   string   `json:"visitDate"`
		Images      []string `json:"images"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"Invalid request body"}`, http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	resp, err := h.reviewClient.CreateReview(ctx, &reviewpb.CreateReviewRequest{
		TourId:      tourID,
		TouristId:   touristID,
		Rating:      int32(body.Rating),
		Comment:     body.Comment,
		TouristName: body.TouristName,
		VisitDate:   body.VisitDate,
		Images:      body.Images,
	})
	if err != nil {
		log.Printf("gRPC CreateReview error: %v", err)
		http.Error(w, `{"error":"Service unavailable"}`, http.StatusBadGateway)
		return
	}

	result := map[string]interface{}{
		"id":          resp.Id,
		"tourId":      resp.TourId,
		"touristId":   resp.TouristId,
		"rating":      resp.Rating,
		"comment":     resp.Comment,
		"touristName": resp.TouristName,
		"visitDate":   resp.VisitDate,
		"commentDate": resp.CommentDate,
		"images":      resp.Images,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(result)
}

// ── stakeholdersHandler: PUT /api/stakeholders/profile/{id}/position → gRPC, ostalo → HTTP proxy ──

type stakeholdersHandler struct {
	proxy          http.Handler
	positionClient positionpb.PositionServiceClient
}

func (h *stakeholdersHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// PUT /api/stakeholders/profile/{userId}/position
	path := strings.TrimPrefix(r.URL.Path, "/api/stakeholders/profile/")
	if r.Method == http.MethodPut && strings.HasSuffix(path, "/position") {
		userIDStr := strings.TrimSuffix(path, "/position")
		userID, err := strconv.ParseInt(userIDStr, 10, 64)
		if err != nil {
			http.Error(w, `{"error":"Invalid user ID"}`, http.StatusBadRequest)
			return
		}
		h.handleUpdatePosition(w, r, userID)
		return
	}

	h.proxy.ServeHTTP(w, r)
}

func (h *stakeholdersHandler) handleUpdatePosition(w http.ResponseWriter, r *http.Request, userID int64) {
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

	resp, err := h.positionClient.UpdatePosition(ctx, &positionpb.UpdatePositionRequest{
		UserId:    userID,
		Latitude:  body.Latitude,
		Longitude: body.Longitude,
	})
	if err != nil {
		log.Printf("gRPC UpdatePosition error: %v", err)
		http.Error(w, `{"error":"Service unavailable"}`, http.StatusBadGateway)
		return
	}

	result := map[string]interface{}{
		"userId":    resp.UserId,
		"latitude":  resp.Latitude,
		"longitude": resp.Longitude,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(result)
}

// ─────────────────────────────────────────────────────────────────────────────

func main() {
	jwtKeyStr := os.Getenv("JWT_KEY")
	if jwtKeyStr == "" {
		jwtKeyStr = "change-me-in-production-min32chars!!"
	}
	jwtKey = []byte(jwtKeyStr)

	authServiceURL := os.Getenv("AUTH_SERVICE_URL")
	if authServiceURL == "" {
		authServiceURL = "http://auth-service:80"
	}
	blogServiceURL := os.Getenv("BLOG_SERVICE_URL")
	if blogServiceURL == "" {
		blogServiceURL = "http://blog-service:3001"
	}
	tourServiceURL := os.Getenv("TOUR_SERVICE_URL")
	if tourServiceURL == "" {
		tourServiceURL = "http://tour-service:8080"
	}
	stakeholdersServiceURL := os.Getenv("STAKEHOLDERS_SERVICE_URL")
	if stakeholdersServiceURL == "" {
		stakeholdersServiceURL = "http://stakeholders-service:80"
	}
	followersServiceURL := os.Getenv("FOLLOWERS_SERVICE_URL")
	if followersServiceURL == "" {
		followersServiceURL = "http://followers-service:8084"
	}
	purchaseServiceURL := os.Getenv("PURCHASE_SERVICE_URL")
	if purchaseServiceURL == "" {
		purchaseServiceURL = "http://purchase-service:8080"
	}

	// gRPC URL-ovi
	tourServiceGrpcURL := os.Getenv("TOUR_SERVICE_GRPC_URL")
	if tourServiceGrpcURL == "" {
		tourServiceGrpcURL = "tour-service:9090"
	}
	stakeholdersGrpcURL := os.Getenv("STAKEHOLDERS_SERVICE_GRPC_URL")
	if stakeholdersGrpcURL == "" {
		stakeholdersGrpcURL = "stakeholders-service:5001"
	}

	// gRPC konekcija ka tour-service
	reviewConn, err := grpc.NewClient(tourServiceGrpcURL,
		grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatalf("Nije moguće konektovati se na tour-service gRPC: %v", err)
	}
	defer reviewConn.Close()
	reviewClient := reviewpb.NewReviewServiceClient(reviewConn)

	// gRPC konekcija ka stakeholders-service
	positionConn, err := grpc.NewClient(stakeholdersGrpcURL,
		grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatalf("Nije moguće konektovati se na stakeholders-service gRPC: %v", err)
	}
	defer positionConn.Close()
	positionClient := positionpb.NewPositionServiceClient(positionConn)

	mux := http.NewServeMux()

	mux.Handle("/api/auth", newReverseProxy(authServiceURL))
	mux.Handle("/api/auth/", newReverseProxy(authServiceURL))
	mux.Handle("/api/blogs", newReverseProxy(blogServiceURL))
	mux.Handle("/api/blogs/", newReverseProxy(blogServiceURL))

	// Tour handler: POST /api/tours/{id}/reviews → gRPC, ostalo → HTTP proxy
	tourProxy := newReverseProxy(tourServiceURL)
	mux.Handle("/api/tours", &tourHandler{proxy: tourProxy, reviewClient: reviewClient})
	mux.Handle("/api/tours/", &tourHandler{proxy: tourProxy, reviewClient: reviewClient})

	// Stakeholders handler: PUT /api/stakeholders/profile/{id}/position → gRPC, ostalo → HTTP proxy
	stakeholdersProxy := newReverseProxy(stakeholdersServiceURL)
	mux.Handle("/api/stakeholders", &stakeholdersHandler{proxy: stakeholdersProxy, positionClient: positionClient})
	mux.Handle("/api/stakeholders/", &stakeholdersHandler{proxy: stakeholdersProxy, positionClient: positionClient})

	mux.Handle("/api/followers", newReverseProxy(followersServiceURL))
	mux.Handle("/api/followers/", newReverseProxy(followersServiceURL))
	mux.Handle("/api/purchases", newReverseProxy(purchaseServiceURL))
	mux.Handle("/api/purchases/", newReverseProxy(purchaseServiceURL))

	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok","service":"api-gateway"}`))
	})

	handler := corsMiddleware(jwtMiddleware(mux))

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("API Gateway pokrenut na portu :%s", port)
	log.Printf("  /api/auth/*          -> %s (HTTP)", authServiceURL)
	log.Printf("  /api/blogs/*         -> %s (HTTP)", blogServiceURL)
	log.Printf("  /api/tours/*         -> %s (HTTP), reviews -> %s (gRPC)", tourServiceURL, tourServiceGrpcURL)
	log.Printf("  /api/stakeholders/*  -> %s (HTTP), position -> %s (gRPC)", stakeholdersServiceURL, stakeholdersGrpcURL)
	log.Printf("  /api/followers/*     -> %s (HTTP)", followersServiceURL)
	log.Printf("  /api/purchases/*     -> %s (HTTP)", purchaseServiceURL)

	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatalf("Gateway se ugasio sa greškom: %v", err)
	}
}
