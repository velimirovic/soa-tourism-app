package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type UserClaims struct {
	ID       string
	Username string
}

// extractUserClaims parses the JWT and returns the user's ID (sub) and username as strings.
func extractUserClaims(authHeader string) (UserClaims, error) {
	tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return jwtKey, nil
	})
	if err != nil || !token.Valid {
		return UserClaims{}, fmt.Errorf("invalid token")
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return UserClaims{}, fmt.Errorf("invalid claims")
	}
	id := fmt.Sprintf("%v", claims["sub"])
	username := fmt.Sprintf("%v", claims["username"])
	return UserClaims{ID: id, Username: username}, nil
}

// extractUserID parses the JWT and returns the "sub" claim as int64.
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
