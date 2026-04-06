import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Comment {
  _id: string;
  userId: string;
  username: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export interface Blog {
  _id: string;
  title: string;
  description: string;
  images: string[];
  authorId: string;
  authorUsername: string;
  comments: Comment[];
  likes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateBlogRequest {
  title: string;
  description: string;
  images: string[];
}

@Injectable({ providedIn: 'root' })
export class BlogService {
  private readonly base = `${environment.apiUrl}/blogs`;

  constructor(private http: HttpClient) {}

  getBlogs(): Observable<Blog[]> {
    return this.http.get<Blog[]>(this.base);
  }

  getBlog(id: string): Observable<Blog> {
    return this.http.get<Blog>(`${this.base}/${id}`);
  }

  createBlog(data: CreateBlogRequest): Observable<Blog> {
    return this.http.post<Blog>(this.base, data);
  }

  toggleLike(id: string): Observable<{ likes: number; liked: boolean }> {
    return this.http.post<{ likes: number; liked: boolean }>(`${this.base}/${id}/like`, {});
  }

  addComment(id: string, text: string): Observable<Comment> {
    return this.http.post<Comment>(`${this.base}/${id}/comments`, { text });
  }

  updateComment(blogId: string, commentId: string, text: string): Observable<Comment> {
    return this.http.put<Comment>(`${this.base}/${blogId}/comments/${commentId}`, { text });
  }

  deleteComment(blogId: string, commentId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${blogId}/comments/${commentId}`);
  }
}
