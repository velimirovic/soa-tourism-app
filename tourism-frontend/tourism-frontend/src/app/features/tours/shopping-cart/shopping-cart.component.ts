import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PurchaseService, CartDto, TourPurchaseTokenDto } from '../../../core/services/purchase.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-shopping-cart',
  standalone: false,
  templateUrl: './shopping-cart.component.html',
  styleUrl: './shopping-cart.component.scss'
})
export class ShoppingCartComponent implements OnInit {

  cart: CartDto | null = null;
  loading = true;
  error = '';
  checkingOut = false;
  checkoutError = '';
  purchasedTokens: TourPurchaseTokenDto[] | null = null;
  removingTourId: number | null = null;

  constructor(
    private purchaseService: PurchaseService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (!this.isTourist) {
      this.router.navigate(['/home']);
      return;
    }
    this.loadCart();
  }

  get isTourist(): boolean {
    return this.authService.getUser()?.role === 'Tourist';
  }

  loadCart(): void {
    this.loading = true;
    this.purchaseService.getCart().subscribe({
      next: (cart) => {
        this.cart = cart;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err?.error?.error ?? 'Failed to load cart.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  removeItem(tourId: number): void {
    this.removingTourId = tourId;
    this.purchaseService.removeFromCart(tourId).subscribe({
      next: (cart) => {
        this.cart = cart;
        this.removingTourId = null;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err?.error?.error ?? 'Failed to remove item.';
        this.removingTourId = null;
        this.cdr.detectChanges();
      }
    });
  }

  checkout(): void {
    this.checkingOut = true;
    this.checkoutError = '';
    this.purchaseService.checkout().subscribe({
      next: (tokens) => {
        this.purchasedTokens = tokens;
        this.checkingOut = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.checkoutError = err?.error?.error ?? 'Checkout failed.';
        this.checkingOut = false;
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

  goToPurchases(): void {
    this.router.navigate(['/purchases']);
  }
}
