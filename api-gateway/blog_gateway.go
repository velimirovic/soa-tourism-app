package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"

	blogpb "api-gateway/proto/blog"
)

// blogHandler routes two requests via gRPC and falls back to HTTP proxy for the rest:
//   POST /api/blogs        → gRPC CreateBlog
//   GET  /api/blogs/:id    → gRPC GetBlogById
type blogHandler struct {
	proxy      http.Handler
	blogClient blogpb.BlogServiceClient
}

func (h *blogHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Strip /api/blogs prefix to get the remaining path segment (empty or "/<id>/...")
	suffix := strings.TrimPrefix(r.URL.Path, "/api/blogs")

	// POST /api/blogs — create blog via gRPC
	if r.Method == http.MethodPost && (suffix == "" || suffix == "/") {
		h.handleCreateBlog(w, r)
		return
	}

	// GET /api/blogs/:id — single blog fetch via gRPC
	// Guard: suffix must be "/<id>" with no further slashes (avoids /feed, /mine, /id/comments …)
	if r.Method == http.MethodGet && strings.HasPrefix(suffix, "/") {
		id := strings.TrimPrefix(suffix, "/")
		if id != "" && !strings.Contains(id, "/") && id != "feed" && id != "mine" {
			h.handleGetBlogById(w, r, id)
			return
		}
	}

	h.proxy.ServeHTTP(w, r)
}

func (h *blogHandler) handleCreateBlog(w http.ResponseWriter, r *http.Request) {
	username, err := extractUsername(r.Header.Get("Authorization"))
	if err != nil {
		http.Error(w, `{"error":"Unauthorized"}`, http.StatusUnauthorized)
		return
	}
	authorID, err := extractUserIDString(r.Header.Get("Authorization"))
	if err != nil {
		http.Error(w, `{"error":"Unauthorized"}`, http.StatusUnauthorized)
		return
	}

	var body struct {
		Title       string   `json:"title"`
		Description string   `json:"description"`
		Images      []string `json:"images"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"Invalid request body"}`, http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	resp, err := h.blogClient.CreateBlog(ctx, &blogpb.CreateBlogRequest{
		Title:          body.Title,
		Description:    body.Description,
		Images:         body.Images,
		AuthorId:       authorID,
		AuthorUsername: username,
	})
	if err != nil {
		log.Printf("gRPC CreateBlog error: %v", err)
		writeGrpcError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(blogResponseToMap(resp))
}

func (h *blogHandler) handleGetBlogById(w http.ResponseWriter, r *http.Request, id string) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	resp, err := h.blogClient.GetBlogById(ctx, &blogpb.GetBlogByIdRequest{Id: id})
	if err != nil {
		log.Printf("gRPC GetBlogById error: %v", err)
		writeGrpcError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(blogResponseToMap(resp))
}

func blogResponseToMap(resp *blogpb.BlogResponse) map[string]interface{} {
	likes := resp.Likes
	if likes == nil {
		likes = []string{}
	}
	images := resp.Images
	if images == nil {
		images = []string{}
	}
	return map[string]interface{}{
		"_id":            resp.Id,
		"id":             resp.Id,
		"title":          resp.Title,
		"description":    resp.Description,
		"images":         images,
		"authorId":       resp.AuthorId,
		"authorUsername": resp.AuthorUsername,
		"createdAt":      resp.CreatedAt,
		"updatedAt":      resp.UpdatedAt,
		"likes":          likes,
		"comments":       []interface{}{},
	}
}
