import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { TourService, TourDto } from '../../../core/services/tour.service';
import { PurchaseService } from '../../../core/services/purchase.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-tour-public-list',
  standalone: false,
  templateUrl: './tour-public-list.component.html',
  styleUrl: './tour-public-list.component.scss'
})
export class TourPublicListComponent implements OnInit {

  tours: TourDto[] = [];
  private allTours: TourDto[] = [];
  loading = true;
  error = '';

  cartTourIds = new Set<number>();
  purchasedTourIds = new Set<number>();
  addingToCart = new Set<number>();

  constructor(
    private tourService: TourService,
    private purchaseService: PurchaseService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  get isTourist(): boolean {
    return this.authService.getUser()?.role === 'Tourist';
  }

  ngOnInit(): void {
    this.tourService.getAllTours().subscribe({
      next: (tours) => {
        this.allTours = tours;
        this.applyFilter();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err?.error?.error ?? 'Failed to load tours.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });

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
          this.applyFilter();
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

  private applyFilter(): void {
    this.tours = this.allTours.filter(t => !this.purchasedTourIds.has(t.id));
  }

  goToDetail(tourId: number): void {
    this.router.navigate(['/tours', tourId]);
  }
}
