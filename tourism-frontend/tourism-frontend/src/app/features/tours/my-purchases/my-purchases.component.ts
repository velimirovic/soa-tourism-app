import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PurchaseService, TourPurchaseTokenDto } from '../../../core/services/purchase.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-my-purchases',
  standalone: false,
  templateUrl: './my-purchases.component.html',
  styleUrl: './my-purchases.component.scss'
})
export class MyPurchasesComponent implements OnInit {

  tokens: TourPurchaseTokenDto[] = [];
  loading = true;
  error = '';

  constructor(
    private purchaseService: PurchaseService,
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
  }

  goToTour(tourId: number): void {
    this.router.navigate(['/tours', tourId]);
  }

  goToTours(): void {
    this.router.navigate(['/tours']);
  }
}
