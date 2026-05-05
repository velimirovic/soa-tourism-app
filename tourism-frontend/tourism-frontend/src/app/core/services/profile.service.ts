import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UserProfile {
  userId: number;
  firstName: string;
  lastName: string;
  profilePicture: string | null;
  biography: string | null;
  motto: string | null;
  currentLatitude: number | null;
  currentLongitude: number | null;
}

export interface UpdateProfileDto {
  firstName: string;
  lastName: string;
  profilePicture: string | null;
  biography: string | null;
  motto: string | null;
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly base = `${environment.apiUrl}/stakeholders/profile`;

  constructor(private http: HttpClient) {}

  getProfile(userId: number): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.base}/${userId}`);
  }

  updateProfile(userId: number, dto: UpdateProfileDto): Observable<UserProfile> {
    return this.http.put<UserProfile>(`${this.base}/${userId}`, dto);
  }

  updatePosition(userId: number, latitude: number, longitude: number): Observable<UserProfile> {
    return this.http.put<UserProfile>(`${this.base}/${userId}/position`, { latitude, longitude });
  }
}