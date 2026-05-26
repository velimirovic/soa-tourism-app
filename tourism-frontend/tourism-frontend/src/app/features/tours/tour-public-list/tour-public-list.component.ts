import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { TourService, TourDto } from '../../../core/services/tour.service';
<<<<<<< HEAD
=======
import { PurchaseService } from '../../../core/services/purchase.service';
import { AuthService } from '../../../core/services/auth.service';
>>>>>>> feat/shoppingCart

@Component({
  selector: 'app-tour-public-list',
  standalone: false,
  templateUrl: './tour-public-list.component.html',
  styleUrl: './tour-public-list.component.scss'
})
export class TourPublicListComponent implements OnInit {

  tours: TourDto[] = [];
  loading = true;
  error = '';

<<<<<<< HEAD
  constructor(
    private tourService: TourService,
=======
  cartTourIds = new Set<number>();
  purchasedTourIds = new Set<number>();
  addingToCart = new Set<number>();

  constructor(
    private tourService: TourService,
    private purchaseService: PurchaseService,
    private authService: AuthService,
>>>>>>> feat/shoppingCart
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

<<<<<<< HEAD
=======
  get isTourist(): boolean {
    return this.authService.getUser()?.role === 'Tourist';
  }

>>>>>>> feat/shoppingCart
  ngOnInit(): void {
    this.tourService.getAllTours().subscribe({
      next: (tours) => {
        this.tours = tours;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err?.error?.error ?? 'Failed to load tours.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
<<<<<<< HEAD
=======

    if (this.isTourist) {
      this.purchaseService.getCart().subscribe({
        next: (cart) => {
          this.cartTourIds = new Set(cart.items.map(i => i.tourId));
          this.cdr.detectChanges();
        }
      });
      this.purchaseService.getTokens().subscribe({
        next: (tokens) => {
          this.purchasedTourIds = new Set(tokens.map(t => t.tourId));
          this.cdr.detectChanges();
        }
      });
    }
  }

  addToCart(event: Event, tour: TourDto): void {
    event.stopPropagation();
    this.addingToCart.add(tour.id);
    this.purchaseService.addToCart(tour.id, tour.name, tour.price).subscribe({
      next: (cart) => {
        this.cartTourIds = new Set(cart.items.map(i => i.tourId));
        this.addingToCart.delete(tour.id);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err?.error?.error ?? 'Failed to add to cart.');
        this.addingToCart.delete(tour.id);
        this.cdr.detectChanges();
      }
    });
  }

  goToCart(event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/cart']);
>>>>>>> feat/shoppingCart
  }

  difficultyClass(difficulty: string): string {
    return difficulty?.toLowerCase() ?? 'easy';
  }

  transportIcon(type: string): string {
    switch (type) {
      case 'BICYCLE': return 'directions_bike';
      case 'CAR':     return 'directions_car';
      default:        return 'directions_walk';
    }
  }

  goToDetail(tourId: number): void {
    this.router.navigate(['/tours', tourId]);
  }
}
