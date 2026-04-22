import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface FollowUser {
  userId: string;
  username: string;
}

export interface Recommendation {
  userId: string;
  username: string;
  score: number;
}

@Injectable({ providedIn: 'root' })
export class FollowersService {
  private readonly base = `${environment.apiUrl}/followers`;

  constructor(private http: HttpClient) {}

  follow(followingId: string, followingUsername: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/follow`, {
      followingId,
      followingUsername,
    });
  }

  unfollow(userId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/unfollow/${userId}`);
  }

  getFollowing(): Observable<FollowUser[]> {
    return this.http.get<FollowUser[]>(`${this.base}/following`);
  }

  getFollowers(): Observable<FollowUser[]> {
    return this.http.get<FollowUser[]>(`${this.base}/followers`);
  }

  getRecommendations(): Observable<Recommendation[]> {
    return this.http.get<Recommendation[]>(`${this.base}/recommendations`);
  }
}
