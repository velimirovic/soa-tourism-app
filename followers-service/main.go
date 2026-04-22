package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	neo4jDriver "github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

var jwtSecret []byte
var driver neo4jDriver.DriverWithContext

type contextKey string

const userKey contextKey = "user"

type Claims struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Role     string `json:"role"`
	jwt.RegisteredClaims
}

type UserInfo struct {
	ID       string
	Username string
}

func getEnv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func currentUser(r *http.Request) UserInfo {
	return r.Context().Value(userKey).(UserInfo)
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

func authMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "missing token"})
			return
		}
		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return jwtSecret, nil
		})
		if err != nil || !token.Valid {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid token"})
			return
		}
		userID, _ := claims.GetSubject()
		ctx := context.WithValue(r.Context(), userKey, UserInfo{ID: userID, Username: claims.Username})
		next(w, r.WithContext(ctx))
	}
}


// POST /followers/follow
func followHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	me := currentUser(r)

	var body struct {
		FollowingID       string `json:"followingId"`
		FollowingUsername string `json:"followingUsername"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.FollowingID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "followingId required"})
		return
	}
	if me.ID == body.FollowingID {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "cannot follow yourself"})
		return
	}

	ctx := context.Background()
	session := driver.NewSession(ctx, neo4jDriver.SessionConfig{AccessMode: neo4jDriver.AccessModeWrite})
	defer session.Close(ctx)

	_, err := session.ExecuteWrite(ctx, func(tx neo4jDriver.ManagedTransaction) (any, error) {
		_, err := tx.Run(ctx, `
			MERGE (a:User {userId: $myId})
			SET a.username = $myUsername
			MERGE (b:User {userId: $theirId})
			SET b.username = $theirUsername
			MERGE (a)-[:FOLLOWS]->(b)
		`, map[string]any{
			"myId":          me.ID,
			"myUsername":    me.Username,
			"theirId":       body.FollowingID,
			"theirUsername": body.FollowingUsername,
		})
		return nil, err
	})
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "followed"})
}

// DELETE /followers/unfollow/{userId}
func unfollowHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	me := currentUser(r)
	theirID := strings.TrimPrefix(r.URL.Path, "/followers/unfollow/")
	if theirID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "userId required"})
		return
	}

	ctx := context.Background()
	session := driver.NewSession(ctx, neo4jDriver.SessionConfig{AccessMode: neo4jDriver.AccessModeWrite})
	defer session.Close(ctx)

	_, err := session.ExecuteWrite(ctx, func(tx neo4jDriver.ManagedTransaction) (any, error) {
		_, err := tx.Run(ctx, `
			MATCH (a:User {userId: $myId})-[r:FOLLOWS]->(b:User {userId: $theirId})
			DELETE r
		`, map[string]any{"myId": me.ID, "theirId": theirID})
		return nil, err
	})
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "unfollowed"})
}

// GET /followers/following
func followingHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	me := currentUser(r)

	ctx := context.Background()
	session := driver.NewSession(ctx, neo4jDriver.SessionConfig{AccessMode: neo4jDriver.AccessModeRead})
	defer session.Close(ctx)

	var users []map[string]string

	_, err := session.ExecuteRead(ctx, func(tx neo4jDriver.ManagedTransaction) (any, error) {
		res, err := tx.Run(ctx, `
			MATCH (a:User {userId: $myId})-[:FOLLOWS]->(b:User)
			RETURN b.userId AS userId, b.username AS username
		`, map[string]any{"myId": me.ID})
		if err != nil {
			return nil, err
		}
		for res.Next(ctx) {
			record := res.Record()
			uid, _ := record.Get("userId")
			uname, _ := record.Get("username")
			users = append(users, map[string]string{
				"userId":   uid.(string),
				"username": uname.(string),
			})
		}
		return nil, res.Err()
	})
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	if users == nil {
		users = []map[string]string{}
	}
	writeJSON(w, http.StatusOK, users)
}

// GET /followers/followers 
func followersHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	me := currentUser(r)

	ctx := context.Background()
	session := driver.NewSession(ctx, neo4jDriver.SessionConfig{AccessMode: neo4jDriver.AccessModeRead})
	defer session.Close(ctx)

	var users []map[string]string

	_, err := session.ExecuteRead(ctx, func(tx neo4jDriver.ManagedTransaction) (any, error) {
		res, err := tx.Run(ctx, `
			MATCH (a:User)-[:FOLLOWS]->(b:User {userId: $myId})
			RETURN a.userId AS userId, a.username AS username
		`, map[string]any{"myId": me.ID})
		if err != nil {
			return nil, err
		}
		for res.Next(ctx) {
			record := res.Record()
			uid, _ := record.Get("userId")
			uname, _ := record.Get("username")
			users = append(users, map[string]string{
				"userId":   uid.(string),
				"username": uname.(string),
			})
		}
		return nil, res.Err()
	})
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	if users == nil {
		users = []map[string]string{}
	}
	writeJSON(w, http.StatusOK, users)
}

// GET /followers/recommendations 
func recommendationsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	me := currentUser(r)

	ctx := context.Background()
	session := driver.NewSession(ctx, neo4jDriver.SessionConfig{AccessMode: neo4jDriver.AccessModeRead})
	defer session.Close(ctx)

	var users []map[string]any

	_, err := session.ExecuteRead(ctx, func(tx neo4jDriver.ManagedTransaction) (any, error) {
		res, err := tx.Run(ctx, `
			MATCH (me:User {userId: $myId})-[:FOLLOWS]->(friend)-[:FOLLOWS]->(rec)
			WHERE rec.userId <> $myId AND NOT (me)-[:FOLLOWS]->(rec)
			RETURN rec.userId AS userId, rec.username AS username, count(*) AS score
			ORDER BY score DESC
			LIMIT 10
		`, map[string]any{"myId": me.ID})
		if err != nil {
			return nil, err
		}
		for res.Next(ctx) {
			record := res.Record()
			uid, _ := record.Get("userId")
			uname, _ := record.Get("username")
			score, _ := record.Get("score")
			users = append(users, map[string]any{
				"userId":   uid.(string),
				"username": uname.(string),
				"score":    score,
			})
		}
		return nil, res.Err()
	})
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	if users == nil {
		users = []map[string]any{}
	}
	writeJSON(w, http.StatusOK, users)
}

// GET /followers/is-following/{userId}  
func isFollowingHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	me := currentUser(r)
	theirID := strings.TrimPrefix(r.URL.Path, "/followers/is-following/")
	if theirID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "userId required"})
		return
	}

	ctx := context.Background()
	session := driver.NewSession(ctx, neo4jDriver.SessionConfig{AccessMode: neo4jDriver.AccessModeRead})
	defer session.Close(ctx)

	isFollowing := false

	_, err := session.ExecuteRead(ctx, func(tx neo4jDriver.ManagedTransaction) (any, error) {
		res, err := tx.Run(ctx, `
			OPTIONAL MATCH (a:User {userId: $myId})-[r:FOLLOWS]->(b:User {userId: $theirId})
			RETURN r IS NOT NULL AS isFollowing
		`, map[string]any{"myId": me.ID, "theirId": theirID})
		if err != nil {
			return nil, err
		}
		if res.Next(ctx) {
			record := res.Record()
			val, _ := record.Get("isFollowing")
			if val != nil {
				isFollowing = val.(bool)
			}
		}
		return nil, res.Err()
	})
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"isFollowing": isFollowing})
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "followers-service"})
}

// Main 

func main() {
	jwtSecret = []byte(getEnv("JWT_SECRET", "change-me-in-production-min32chars!!"))

	neo4jURI := getEnv("NEO4J_URI", "bolt://neo4j:7687")
	neo4jUser := getEnv("NEO4J_USERNAME", "neo4j")
	neo4jPass := getEnv("NEO4J_PASSWORD", "nekaSifra")

	var err error
	driver, err = neo4jDriver.NewDriverWithContext(
		neo4jURI,
		neo4jDriver.BasicAuth(neo4jUser, neo4jPass, ""),
	)
	if err != nil {
		log.Fatalf("Failed to create Neo4j driver: %v", err)
	}
	defer driver.Close(context.Background())

	if err = driver.VerifyConnectivity(context.Background()); err != nil {
		log.Fatalf("Failed to connect to Neo4j: %v", err)
	}
	log.Println("Connected to Neo4j")

	mux := http.NewServeMux()
	mux.HandleFunc("/followers/follow", authMiddleware(followHandler))
	mux.HandleFunc("/followers/unfollow/", authMiddleware(unfollowHandler))
	mux.HandleFunc("/followers/following", authMiddleware(followingHandler))
	mux.HandleFunc("/followers/followers", authMiddleware(followersHandler))
	mux.HandleFunc("/followers/recommendations", authMiddleware(recommendationsHandler))
	mux.HandleFunc("/followers/is-following/", authMiddleware(isFollowingHandler))
	mux.HandleFunc("/health", healthHandler)

	handler := corsMiddleware(mux)

	port := getEnv("PORT", "8084")
	log.Printf("Followers service running on port %s", port)
	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}
