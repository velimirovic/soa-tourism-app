import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CreateTourRequest {
  name: string;
  description: string;
  difficulty: string;
  price: number;
  tags: string[];
}

export interface KeyPointDto {
  id: number;
  tourId: number;
  name: string;
  description: string;
  imageUrl: string;
  latitude: number;
  longitude: number;
}

export interface CreateKeyPointRequest {
  name: string;
  description: string;
  imageUrl: string;
  latitude: number;
  longitude: number;
}

export interface UpdateTourRequest {
  name: string;
  description: string;
  difficulty: string;
  price: number;
  tags: string[];
}

export interface CreateReviewRequest {
  rating: number;
  comment: string;
  touristName: string;
  visitDate: string;
  images: string[];
}

export interface ReviewDto {
  id: number;
  tourId: number;
  touristId: number;
  touristName: string;
  rating: number;
  comment: string;
  visitDate: string;
  commentDate: string;
  images: string[];
}

export interface TourDurationDto {
  id: number;
  tourId: number;
  transportType: 'WALKING' | 'BICYCLE' | 'CAR';
  durationInMinutes: number;
}

export interface CreateTourDurationRequest {
  transportType: 'WALKING' | 'BICYCLE' | 'CAR';
  durationInMinutes: number;
}

export interface TourDto {
  id: number;
  name: string;
  description: string;
  difficulty: string;
  tags: string[];
  status: string;
  price: number;
  authorId: number;
  createdAt: string;
  publishedAt?: string;
  archivedAt?: string;
  lengthInKm?: number;
  firstKeyPointImageUrl?: string;
  firstKeyPoint?: KeyPointDto;
  durations?: TourDurationDto[];
}

@Injectable({ providedIn: 'root' })
export class TourService {

  private readonly base = `${environment.apiUrl}/tours`;

  constructor(private http: HttpClient) {}

  createTour(req: CreateTourRequest): Observable<TourDto> {
    return this.http.post<TourDto>(this.base, req);
  }

  getMyTours(): Observable<TourDto[]> {
    return this.http.get<TourDto[]>(`${this.base}/my`);
  }

  getKeyPoints(tourId: number): Observable<KeyPointDto[]> {
    return this.http.get<KeyPointDto[]>(`${this.base}/${tourId}/keypoints`);
  }

  getAllTours(): Observable<TourDto[]> {
    return this.http.get<TourDto[]>(this.base);
  }

  getTour(tourId: number): Observable<TourDto> {
    return this.http.get<TourDto>(`${this.base}/${tourId}`);
  }

  updateTour(tourId: number, req: UpdateTourRequest): Observable<TourDto> {
    return this.http.put<TourDto>(`${this.base}/${tourId}`, req);
  }

  addKeyPoint(tourId: number, req: CreateKeyPointRequest): Observable<KeyPointDto> {
    return this.http.post<KeyPointDto>(`${this.base}/${tourId}/keypoints`, req);
  }

  deleteKeyPoint(tourId: number, keyPointId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${tourId}/keypoints/${keyPointId}`);
  }

  updateKeyPoint(tourId: number, keyPointId: number, req: CreateKeyPointRequest): Observable<KeyPointDto> {
    return this.http.put<KeyPointDto>(`${this.base}/${tourId}/keypoints/${keyPointId}`, req);
  }

  publishTour(tourId: number): Observable<TourDto> {
    return this.http.post<TourDto>(`${this.base}/${tourId}/publish`, {});
  }

  archiveTour(tourId: number): Observable<TourDto> {
    return this.http.post<TourDto>(`${this.base}/${tourId}/archive`, {});
  }

  activateTour(tourId: number): Observable<TourDto> {
    return this.http.post<TourDto>(`${this.base}/${tourId}/activate`, {});
  }

  getDurations(tourId: number): Observable<TourDurationDto[]> {
    return this.http.get<TourDurationDto[]>(`${this.base}/${tourId}/durations`);
  }

  addDuration(tourId: number, req: CreateTourDurationRequest): Observable<TourDurationDto> {
    return this.http.post<TourDurationDto>(`${this.base}/${tourId}/durations`, req);
  }

  getReviews(tourId: number): Observable<ReviewDto[]> {
    return this.http.get<ReviewDto[]>(`${this.base}/${tourId}/reviews`);
  }

  addReview(tourId: number, req: CreateReviewRequest): Observable<ReviewDto> {
    return this.http.post<ReviewDto>(`${this.base}/${tourId}/reviews`, req);
  }
}
