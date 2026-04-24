package com.tourservice.util;

import java.util.Base64;
import java.util.Map;

import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;

@Component
public class JwtUtil {

    private final ObjectMapper objectMapper = new ObjectMapper();

    public Long extractUserId(String authHeader) {
        try {
            String payload = decodePayload(authHeader);
            if (payload == null) return null;
            Map<?, ?> claims = objectMapper.readValue(payload, Map.class);
            Object sub = claims.get("sub");
            if (sub == null) return null;
            return Long.parseLong(sub.toString());
        } catch (Exception e) {
            return null;
        }
    }

    public String extractRole(String authHeader) {
        try {
            String payload = decodePayload(authHeader);
            if (payload == null) return null;
            Map<?, ?> claims = objectMapper.readValue(payload, Map.class);
            Object role = claims.get("http://schemas.microsoft.com/ws/2008/06/identity/claims/role");
            return role != null ? role.toString() : null;
        } catch (Exception e) {
            return null;
        }
    }

    private String decodePayload(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        String token = authHeader.substring(7);
        String[] parts = token.split("\\.");
        if (parts.length < 2) return null;
        byte[] decoded = Base64.getUrlDecoder().decode(parts[1]);
        return new String(decoded);
    }
}
