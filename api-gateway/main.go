package main

import (
	"context"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strings"

	"github.com/golang-jwt/jwt/v5"
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
	tourServiceGrpcURL := os.Getenv("TOUR_SERVICE_GRPC_URL")
	if tourServiceGrpcURL == "" {
		tourServiceGrpcURL = "tour-service:9090"
	}

	// ── gRPC-Gateway: HTTP/JSON → gRPC transcoding ──────────────────────────────
	// Follows the grpc-gateway pattern: gateway translates REST requests to gRPC
	// calls on the tour-service using the routes defined in tour_execution.proto.
	ctx := context.Background()
	gwMux, err := newGatewayMux(ctx, tourServiceGrpcURL)
	if err != nil {
		log.Fatalf("Failed to create gRPC gateway: %v", err)
	}

	mux := http.NewServeMux()
	tourProxy := newReverseProxy(tourServiceURL)

	// ── gRPC-backed routes ───────────────────────────────────────────────────────
	// POST /api/tours/executions → gRPC StartTour via gateway
	// All other methods → REST proxy (e.g. GET to fetch active execution)
	mux.HandleFunc("/api/tours/executions", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			r.URL.Path = strings.TrimPrefix(r.URL.Path, "/api")
			gwMux.ServeHTTP(w, r)
		} else {
			tourProxy.ServeHTTP(w, r)
		}
	})

	// POST /api/tours/executions/{id}/check-position → gRPC CheckPosition via gateway
	// All other paths/methods → REST proxy (complete, abandon, get by id, etc.)
	mux.HandleFunc("/api/tours/executions/", func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/api/tours/executions/")
		parts := strings.Split(strings.Trim(path, "/"), "/")
		if len(parts) == 2 && parts[1] == "check-position" && r.Method == http.MethodPost {
			r.URL.Path = strings.TrimPrefix(r.URL.Path, "/api")
			gwMux.ServeHTTP(w, r)
		} else {
			tourProxy.ServeHTTP(w, r)
		}
	})

	// ── REST proxy routes ────────────────────────────────────────────────────────
	mux.Handle("/api/auth", newReverseProxy(authServiceURL))
	mux.Handle("/api/auth/", newReverseProxy(authServiceURL))
	mux.Handle("/api/blogs", newReverseProxy(blogServiceURL))
	mux.Handle("/api/blogs/", newReverseProxy(blogServiceURL))
	mux.Handle("/api/tours", tourProxy)
	mux.Handle("/api/tours/", tourProxy)
	mux.Handle("/api/stakeholders", newReverseProxy(stakeholdersServiceURL))
	mux.Handle("/api/stakeholders/", newReverseProxy(stakeholdersServiceURL))
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
	log.Printf("  gRPC Gateway → tour-service: %s", tourServiceGrpcURL)

	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatalf("Gateway se ugasio sa greškom: %v", err)
	}
}
