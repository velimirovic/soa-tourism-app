package main

import (
	"context"
	"log"
	"net"
	"os"

	followerspb "followers-service/proto/followers"

	neo4jDriver "github.com/neo4j/neo4j-go-driver/v5/neo4j"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type followersGrpcServer struct {
	followerspb.UnimplementedFollowersServiceServer
}

func (s *followersGrpcServer) Follow(ctx context.Context, req *followerspb.FollowRequest) (*followerspb.FollowResponse, error) {
	if req.FollowerId == req.FollowingId {
		return nil, status.Error(codes.InvalidArgument, "cannot follow yourself")
	}
	if req.FollowerId == "" || req.FollowingId == "" {
		return nil, status.Error(codes.InvalidArgument, "follower_id and following_id are required")
	}

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
			"myId":          req.FollowerId,
			"myUsername":    req.FollowerUsername,
			"theirId":       req.FollowingId,
			"theirUsername": req.FollowingUsername,
		})
		return nil, err
	})
	if err != nil {
		return nil, status.Errorf(codes.Internal, "database error: %v", err)
	}

	return &followerspb.FollowResponse{Message: "followed"}, nil
}

func (s *followersGrpcServer) IsFollowing(ctx context.Context, req *followerspb.IsFollowingRequest) (*followerspb.IsFollowingResponse, error) {
	if req.FollowerId == "" || req.FollowingId == "" {
		return nil, status.Error(codes.InvalidArgument, "follower_id and following_id are required")
	}

	session := driver.NewSession(ctx, neo4jDriver.SessionConfig{AccessMode: neo4jDriver.AccessModeRead})
	defer session.Close(ctx)

	isFollowing := false

	_, err := session.ExecuteRead(ctx, func(tx neo4jDriver.ManagedTransaction) (any, error) {
		res, err := tx.Run(ctx, `
			OPTIONAL MATCH (a:User {userId: $myId})-[r:FOLLOWS]->(b:User {userId: $theirId})
			RETURN r IS NOT NULL AS isFollowing
		`, map[string]any{"myId": req.FollowerId, "theirId": req.FollowingId})
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
		return nil, status.Errorf(codes.Internal, "database error: %v", err)
	}

	return &followerspb.IsFollowingResponse{IsFollowing: isFollowing}, nil
}

func startGrpcServer() {
	port := os.Getenv("GRPC_PORT")
	if port == "" {
		port = "9091"
	}
	lis, err := net.Listen("tcp", ":"+port)
	if err != nil {
		log.Fatalf("gRPC listen failed: %v", err)
	}
	s := grpc.NewServer()
	followerspb.RegisterFollowersServiceServer(s, &followersGrpcServer{})
	log.Printf("Followers gRPC server listening on port %s", port)
	if err := s.Serve(lis); err != nil {
		log.Fatalf("gRPC server error: %v", err)
	}
}
