import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PurchaseService, TourPurchaseTokenDto } from '../../../core/services/purchase.service';
import { TourService } from '../../../core/services/tour.service';
import { AuthService } from '../../../core/services/auth.service';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-my-purchases',
  standalone: false,
  templateUrl: './my-purchases.component.html',
  styleUrl: './my-purchases.component.scss'
})
export class MyPurchasesComponent implements OnInit {

  tokens: TourPurchaseTokenDto[] = [];
  completedTourIds = new Set<number>();
  activeTourId: number | null = null;
  loading = true;
  error = '';

  constructor(
    private purchaseService: PurchaseService,
    private tourService: TourService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (this.authService.getUser()?.role !== 'Tourist') {
      this.router.navigate(['/home']);
      return;
    }

    this.purchaseService.getTokens().subscribe({
      next: (tokens) => {
        this.tokens = tokens;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err?.error?.error ?? 'Failed to load purchases.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });

    this.tourService.getCompletedTourIds().pipe(catchError(() => of([]))).subscribe(ids => {
      this.completedTourIds = new Set(ids.map(id => Number(id)));
      this.cdr.detectChanges();
    });

    this.tourService.getActiveExecution().pipe(catchError(() => of(null))).subscribe(ex => {
      this.activeTourId = ex ? Number(ex.tourId) : null;
      this.cdr.detectChanges();
    });
  }

  tourStatus(tourId: number): 'completed' | 'active' | 'purchased' {
    if (this.completedTourIds.has(tourId)) return 'completed';
    if (this.activeTourId === tourId) return 'active';
    return 'purchased';
  }

  startTour(tourId: number): void {
    this.router.navigate(['/tours', tourId, 'execute']);
  }

  goToTour(tourId: number): void {
    this.router.navigate(['/tours', tourId]);
  }

  goToTours(): void {
    this.router.navigate(['/tours']);
  }
}
