package main

import (
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

var jwtKey []byte

// javne rute koje ne zahtevaju JWT token
var publicPaths = []string{
	"/auth/register",
	"/auth/login",
	"/health",
}

func isPublicPath(path string) bool {
	// Skidamo /api prefiks radi poređenja
	stripped := strings.TrimPrefix(path, "/api")
	for _, p := range publicPaths {
		if stripped == p || strings.HasPrefix(stripped, p+"/") {
			return true
		}
	}
	return false
}

// corsMiddleware dodaje CORS zaglavlja na svaki odgovor
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		// Preflight zahtev — vracamo 204 odmah
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// jwtMiddleware proverava JWT token za zaštićene rute
func jwtMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Javne rute propuštamo bez provere tokena
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
			// Proveravamo da li je algoritam potpisivanja HMAC
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

// newReverseProxy kreira reverse proxy koji uklanja /api prefiks pre prosleđivanja
// npr. /api/auth/register -> /auth/register na ciljnom servisu
func newReverseProxy(target string) http.Handler {
	targetURL, err := url.Parse(target)
	if err != nil {
		log.Fatalf("Neispravan URL servisa %s: %v", target, err)
	}

	proxy := httputil.NewSingleHostReverseProxy(targetURL)

	originalDirector := proxy.Director
	proxy.Director = func(req *http.Request) {
		originalDirector(req)

		// Uklanjamo /api prefiks kako bi servis dobio svoju nativnu putanju
		// /api/auth/register -> /auth/register
		req.URL.Path = strings.TrimPrefix(req.URL.Path, "/api")
		if req.URL.RawPath != "" {
			req.URL.RawPath = strings.TrimPrefix(req.URL.RawPath, "/api")
		}

		req.Host = targetURL.Host
	}

	// Greška pri prosleđivanju zahteva — servis nije dostupan
	proxy.ErrorHandler = func(w http.ResponseWriter, r *http.Request, err error) {
		log.Printf("Greška proxy-ja za %s: %v", r.URL.Path, err)
		http.Error(w, `{"error":"Servis nije dostupan"}`, http.StatusBadGateway)
	}

	return proxy
}

func main() {
	// JWT tajni ključ mora biti isti kao u auth-servisu
	jwtKeyStr := os.Getenv("JWT_KEY")
	if jwtKeyStr == "" {
		jwtKeyStr = "change-me-in-production-min32chars!!"
	}
	jwtKey = []byte(jwtKeyStr)

	// URL-ovi servisa unutar Docker mreže
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

	mux := http.NewServeMux()

	// Rutiranje zahteva ka odgovarajucim servisima
	mux.Handle("/api/auth", newReverseProxy(authServiceURL))
	mux.Handle("/api/auth/", newReverseProxy(authServiceURL))
	mux.Handle("/api/blogs", newReverseProxy(blogServiceURL))
	mux.Handle("/api/blogs/", newReverseProxy(blogServiceURL))
	mux.Handle("/api/tours", newReverseProxy(tourServiceURL))
	mux.Handle("/api/tours/", newReverseProxy(tourServiceURL))
	mux.Handle("/api/stakeholders", newReverseProxy(stakeholdersServiceURL))
	mux.Handle("/api/stakeholders/", newReverseProxy(stakeholdersServiceURL))
	mux.Handle("/api/followers", newReverseProxy(followersServiceURL))
	mux.Handle("/api/followers/", newReverseProxy(followersServiceURL))

	// Health check endpoint za proveru stanja gateway-a
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok","service":"api-gateway"}`))
	})

	// Primenjujemo middleware: prvo CORS, pa JWT provera
	handler := corsMiddleware(jwtMiddleware(mux))

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("API Gateway pokrenut na portu :%s", port)
	log.Printf("  /api/auth/*          -> %s", authServiceURL)
	log.Printf("  /api/blogs/*         -> %s", blogServiceURL)
	log.Printf("  /api/tours/*         -> %s", tourServiceURL)
	log.Printf("  /api/stakeholders/*  -> %s", stakeholdersServiceURL)
	log.Printf("  /api/followers/*     -> %s", followersServiceURL)

	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatalf("Gateway se ugasio sa greškom: %v", err)
	}
}
