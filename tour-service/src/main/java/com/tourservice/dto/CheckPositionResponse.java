package com.tourservice.dto;

import java.util.List;

public class CheckPositionResponse {
    private Long executionId;
    private List<CompletedKeyPointResponse> newlyCompletedKeyPoints;
    private List<CompletedKeyPointResponse> allCompletedKeyPoints;
    private boolean tourCompleted;

    public CheckPositionResponse(Long executionId,
                                  List<CompletedKeyPointResponse> newly,
                                  List<CompletedKeyPointResponse> all,
                                  boolean tourCompleted) {
        this.executionId              = executionId;
        this.newlyCompletedKeyPoints  = newly;
        this.allCompletedKeyPoints    = all;
        this.tourCompleted            = tourCompleted;
    }

    public Long getExecutionId()                                   { return executionId; }
    public List<CompletedKeyPointResponse> getNewlyCompletedKeyPoints() { return newlyCompletedKeyPoints; }
    public List<CompletedKeyPointResponse> getAllCompletedKeyPoints()    { return allCompletedKeyPoints; }
    public boolean isTourCompleted()                               { return tourCompleted; }
}
