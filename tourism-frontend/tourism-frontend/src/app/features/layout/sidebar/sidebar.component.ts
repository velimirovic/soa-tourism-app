<<<<<<< HEAD
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
=======
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { PurchaseService } from '../../../core/services/purchase.service';
>>>>>>> feat/shoppingCart

@Component({
  selector: 'app-sidebar',
  standalone: false,
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
<<<<<<< HEAD
export class SidebarComponent {

  constructor(private authService: AuthService, private router: Router) {}
=======
export class SidebarComponent implements OnInit {

  cartCount = 0;

  constructor(
    private authService: AuthService,
    private router: Router,
    private purchaseService: PurchaseService
  ) {}

  ngOnInit(): void {
    this.purchaseService.cartCount$.subscribe(count => {
      this.cartCount = count;
    });
    if (this.isTourist) {
      this.purchaseService.refreshCartCount();
    }
  }
>>>>>>> feat/shoppingCart

  get isAdmin(): boolean {
    return this.authService.getUser()?.role === 'Admin';
  }

  get isGuide(): boolean {
    return this.authService.getUser()?.role === 'Guide';
  }

  get isTourist(): boolean {
    return this.authService.getUser()?.role === 'Tourist';
  }

  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  get user() {
    return this.authService.getUser();
  }

  /** Tours route depends on role: Guide → /tours/my, Tourist → /tours */
  get toursRoute(): string {
    return this.isGuide ? '/tours/my' : '/tours';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/home']);
  }
}
