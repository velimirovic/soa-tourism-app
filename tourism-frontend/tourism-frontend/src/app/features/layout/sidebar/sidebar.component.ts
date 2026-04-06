import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: false,
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {

  navItems = [
    { label: 'Home',     icon: 'home',          route: '/home',     exact: true  },
    { label: 'Blogs',    icon: 'article',        route: '/blogs',    exact: false },
    { label: 'Guides',   icon: 'person',         route: '/guides',   exact: false },
    { label: 'Tours',    icon: 'map',            route: '/tours',    exact: false },
    { label: 'Bookings', icon: 'bookmark',       route: '/bookings', exact: false },
    { label: 'Me',       icon: 'account_circle', route: '/profile',  exact: false },
  ];

  constructor(private authService: AuthService, private router: Router) {}

  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  get user() {
    return this.authService.getUser();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/home']);
  }
}
