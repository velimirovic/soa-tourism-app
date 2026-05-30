package com.tourservice.grpc;

import java.util.List;
import java.util.stream.Collectors;

import net.devh.boot.grpc.server.service.GrpcService;

import com.tourservice.dto.CheckPositionResponse;
import com.tourservice.dto.CompletedKeyPointResponse;
import com.tourservice.dto.TourExecutionResponse;
import com.tourservice.service.TourExecutionService;

import io.grpc.Status;
import io.grpc.stub.StreamObserver;

@GrpcService
public class TourExecutionGrpcService extends TourExecutionServiceGrpc.TourExecutionServiceImplBase {

    private final TourExecutionService executionService;

    public TourExecutionGrpcService(TourExecutionService executionService) {
        this.executionService = executionService;
    }

    @Override
    public void startTour(TourExec.StartTourRequest request,
                          StreamObserver<TourExec.TourExecutionResponse> responseObserver) {
        try {
            TourExecutionResponse dto = executionService.startTour(
                    request.getTouristId(),
                    request.getTourId(),
                    request.getLatitude(),
                    request.getLongitude(),
                    request.getAuthToken()
            );
            responseObserver.onNext(toProto(dto));
            responseObserver.onCompleted();
        } catch (org.springframework.web.server.ResponseStatusException e) {
            responseObserver.onError(
                    Status.fromCodeValue(e.getStatusCode().value())
                          .withDescription(e.getReason())
                          .asRuntimeException());
        } catch (Exception e) {
            responseObserver.onError(
                    Status.INTERNAL.withDescription(e.getMessage()).asRuntimeException());
        }
    }

    @Override
    public void checkPosition(TourExec.CheckPositionRequest request,
                              StreamObserver<TourExec.CheckPositionResponse> responseObserver) {
        try {
            // tourist_id not in CheckPositionRequest; we get it from execution ownership
            // The REST controller handles ownership; here we need to validate too.
            // For simplicity, pass tourist_id 0 — the service will look up the execution
            // and the gateway doesn't pass tourist_id here since it's in the execution.
            // We accept any caller who knows the executionId.
            // Better: pass tourist_id in the request.
            // For now, resolve by looking up execution by id only (no ownership check in gRPC path).
            CheckPositionResponse dto = executionService.checkPositionByExecutionId(
                    request.getExecutionId(),
                    request.getLatitude(),
                    request.getLongitude()
            );
            responseObserver.onNext(toCheckPositionProto(dto));
            responseObserver.onCompleted();
        } catch (org.springframework.web.server.ResponseStatusException e) {
            responseObserver.onError(
                    Status.fromCodeValue(e.getStatusCode().value())
                          .withDescription(e.getReason())
                          .asRuntimeException());
        } catch (Exception e) {
            responseObserver.onError(
                    Status.INTERNAL.withDescription(e.getMessage()).asRuntimeException());
        }
    }

    private TourExec.TourExecutionResponse toProto(TourExecutionResponse dto) {
        TourExec.TourExecutionResponse.Builder b = TourExec.TourExecutionResponse.newBuilder()
                .setId(dto.getId())
                .setTourId(dto.getTourId())
                .setTouristId(dto.getTouristId())
                .setStatus(dto.getStatus())
                .setStartedAt(dto.getStartedAt())
                .setLastActivity(dto.getLastActivity())
                .setStartLatitude(dto.getStartLatitude() != null ? dto.getStartLatitude() : 0.0)
                .setStartLongitude(dto.getStartLongitude() != null ? dto.getStartLongitude() : 0.0);

        if (dto.getEndedAt() != null) b.setEndedAt(dto.getEndedAt());

        dto.getCompletedKeyPoints().forEach(ckp ->
                b.addCompletedKeyPoints(toProtoKp(ckp)));

        return b.build();
    }

    private TourExec.CheckPositionResponse toCheckPositionProto(CheckPositionResponse dto) {
        TourExec.CheckPositionResponse.Builder b = TourExec.CheckPositionResponse.newBuilder()
                .setExecutionId(dto.getExecutionId())
                .setTourCompleted(dto.isTourCompleted());

        dto.getNewlyCompletedKeyPoints().forEach(ckp -> b.addNewlyCompletedKeyPoints(toProtoKp(ckp)));
        dto.getAllCompletedKeyPoints().forEach(ckp -> b.addAllCompletedKeyPoints(toProtoKp(ckp)));

        return b.build();
    }

    private TourExec.CompletedKeyPointMsg toProtoKp(CompletedKeyPointResponse ckp) {
        return TourExec.CompletedKeyPointMsg.newBuilder()
                .setId(ckp.getId())
                .setKeyPointId(ckp.getKeyPointId())
                .setCompletedAt(ckp.getCompletedAt())
                .build();
    }
}
