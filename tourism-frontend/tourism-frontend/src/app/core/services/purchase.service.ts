import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface OrderItemDto {
  id: number;
  tourId: number;
  tourName: string;
  price: number;
}

export interface CartDto {
  id: number;
  touristId: number;
  items: OrderItemDto[];
  totalPrice: number;
}

export interface TourPurchaseTokenDto {
  id: number;
  touristId: number;
  tourId: number;
  tourName: string;
  token: string;
  purchasedAt: string;
}

@Injectable({ providedIn: 'root' })
export class PurchaseService {

  private readonly base = `${environment.apiUrl}/purchases`;
  private cartCountSubject = new BehaviorSubject<number>(0);
  cartCount$ = this.cartCountSubject.asObservable();

  constructor(private http: HttpClient) {}

  getCart(): Observable<CartDto> {
    return this.http.get<CartDto>(`${this.base}/shopping-cart`).pipe(
      tap(cart => this.cartCountSubject.next(cart.items.length))
    );
  }

  addToCart(tourId: number, tourName: string, price: number): Observable<CartDto> {
    return this.http.post<CartDto>(`${this.base}/shopping-cart/items`, { tourId, tourName, price }).pipe(
      tap(cart => this.cartCountSubject.next(cart.items.length))
    );
  }

  removeFromCart(tourId: number): Observable<CartDto> {
    return this.http.delete<CartDto>(`${this.base}/shopping-cart/items/${tourId}`).pipe(
      tap(cart => this.cartCountSubject.next(cart.items.length))
    );
  }

  checkout(): Observable<TourPurchaseTokenDto[]> {
    return this.http.post<TourPurchaseTokenDto[]>(`${this.base}/shopping-cart/checkout`, {}).pipe(
      tap(() => this.cartCountSubject.next(0))
    );
  }

  getTokens(): Observable<TourPurchaseTokenDto[]> {
    return this.http.get<TourPurchaseTokenDto[]>(`${this.base}/purchase-tokens`);
  }

  checkPurchased(tourId: number): Observable<{ purchased: boolean }> {
    return this.http.get<{ purchased: boolean }>(`${this.base}/purchase-tokens/check`, {
      params: { tourId: tourId.toString() }
    });
  }

  refreshCartCount(): void {
    this.getCart().subscribe();
  }
}
