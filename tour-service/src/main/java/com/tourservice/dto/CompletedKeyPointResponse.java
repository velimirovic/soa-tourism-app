package com.tourservice.dto;

import com.tourservice.model.CompletedKeyPoint;

public class CompletedKeyPointResponse {
    private Long id;
    private Long keyPointId;
    private String completedAt;

    public static CompletedKeyPointResponse from(CompletedKeyPoint ckp) {
        CompletedKeyPointResponse r = new CompletedKeyPointResponse();
        r.id          = ckp.getId();
        r.keyPointId  = ckp.getKeyPointId();
        r.completedAt = ckp.getCompletedAt().toString();
        return r;
    }

    public Long getId()           { return id; }
    public Long getKeyPointId()   { return keyPointId; }
    public String getCompletedAt(){ return completedAt; }
}
