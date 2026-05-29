package com.tourservice.grpc;

import com.tourservice.model.Review;
import com.tourservice.repository.ReviewRepository;
import com.tourservice.repository.TourRepository;
import io.grpc.Status;
import io.grpc.stub.StreamObserver;
import net.devh.boot.grpc.server.service.GrpcService;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@GrpcService
public class ReviewGrpcService extends ReviewServiceGrpc.ReviewServiceImplBase {

    @Autowired
    private ReviewRepository reviewRepository;

    @Autowired
    private TourRepository tourRepository;

    @Override
    public void createReview(CreateReviewRequest request, StreamObserver<ReviewResponse> responseObserver) {
        if (!tourRepository.existsById(request.getTourId())) {
            responseObserver.onError(Status.NOT_FOUND
                    .withDescription("Tour not found")
                    .asRuntimeException());
            return;
        }

        Review review = new Review();
        review.setTourId(request.getTourId());
        review.setTouristId(request.getTouristId());
        review.setRating(request.getRating());
        review.setComment(request.getComment());
        review.setTouristName(request.getTouristName());
        review.setVisitDate(LocalDate.parse(request.getVisitDate()));
        review.setCommentDate(LocalDateTime.now());
        review.setImages(request.getImagesList().isEmpty() ? List.of() : request.getImagesList());

        review = reviewRepository.save(review);

        ReviewResponse response = ReviewResponse.newBuilder()
                .setId(review.getId())
                .setTourId(review.getTourId())
                .setTouristId(review.getTouristId())
                .setRating(review.getRating())
                .setComment(review.getComment() != null ? review.getComment() : "")
                .setTouristName(review.getTouristName() != null ? review.getTouristName() : "")
                .setVisitDate(review.getVisitDate().toString())
                .setCommentDate(review.getCommentDate().toString())
                .addAllImages(review.getImages() != null ? review.getImages() : List.of())
                .build();

        responseObserver.onNext(response);
        responseObserver.onCompleted();
    }
}
