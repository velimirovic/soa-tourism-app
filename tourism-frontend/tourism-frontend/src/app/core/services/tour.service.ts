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
  firstKeyPointImageUrl?: string;
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

  getTour(tourId: number): Observable<TourDto> {
    return this.http.get<TourDto>(`${this.base}/${tourId}`);
  }

  getReviews(tourId: number): Observable<ReviewDto[]> {
    return this.http.get<ReviewDto[]>(`${this.base}/${tourId}/reviews`);
  }

  addReview(tourId: number, req: CreateReviewRequest): Observable<ReviewDto> {
    return this.http.post<ReviewDto>(`${this.base}/${tourId}/reviews`, req);
  }
}
