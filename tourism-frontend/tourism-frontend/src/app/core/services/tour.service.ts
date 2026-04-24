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
}
