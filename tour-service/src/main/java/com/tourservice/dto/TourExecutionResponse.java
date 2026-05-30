package com.tourservice.dto;

import java.util.List;
import java.util.stream.Collectors;

import com.tourservice.model.CompletedKeyPoint;
import com.tourservice.model.TourExecution;

public class TourExecutionResponse {
    private Long id;
    private Long tourId;
    private Long touristId;
    private String status;
    private String startedAt;
    private String endedAt;
    private String lastActivity;
    private Double startLatitude;
    private Double startLongitude;
    private List<CompletedKeyPointResponse> completedKeyPoints;

    public static TourExecutionResponse from(TourExecution ex, List<CompletedKeyPoint> completed) {
        TourExecutionResponse r = new TourExecutionResponse();
        r.id               = ex.getId();
        r.tourId           = ex.getTourId();
        r.touristId        = ex.getTouristId();
        r.status           = ex.getStatus();
        r.startedAt        = ex.getStartedAt().toString();
        r.endedAt          = ex.getEndedAt() != null ? ex.getEndedAt().toString() : null;
        r.lastActivity     = ex.getLastActivity().toString();
        r.startLatitude    = ex.getStartLatitude();
        r.startLongitude   = ex.getStartLongitude();
        r.completedKeyPoints = completed.stream()
                .map(CompletedKeyPointResponse::from)
                .collect(Collectors.toList());
        return r;
    }

    public Long getId()               { return id; }
    public Long getTourId()           { return tourId; }
    public Long getTouristId()        { return touristId; }
    public String getStatus()         { return status; }
    public String getStartedAt()      { return startedAt; }
    public String getEndedAt()        { return endedAt; }
    public String getLastActivity()   { return lastActivity; }
    public Double getStartLatitude()  { return startLatitude; }
    public Double getStartLongitude() { return startLongitude; }
    public List<CompletedKeyPointResponse> getCompletedKeyPoints() { return completedKeyPoints; }
}
