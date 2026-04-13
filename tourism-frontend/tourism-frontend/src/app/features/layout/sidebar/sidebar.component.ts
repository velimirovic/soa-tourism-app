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
    { label: 'Home',     icon: 'home',           route: '/home',    exact: true,  requiresAuth: false },
    { label: 'Blogs',    icon: 'article',        route: '/blogs',   exact: false, requiresAuth: true  },
    { label: 'Guides',   icon: 'person',         route: '/guides',  exact: false, requiresAuth: false },
    { label: 'Tours',    icon: 'map',            route: '/tours',   exact: false, requiresAuth: false },
    { label: 'Me',       icon: 'account_circle', route: '/profile', exact: false, requiresAuth: true  },
  ];

  get isAdmin(): boolean {
    const user = this.authService.getUser();
    return user?.role === 'Admin';
  }

  constructor(private authService: AuthService, private router: Router) {}

  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  get visibleNavItems() {
    return this.navItems.filter(item => !item.requiresAuth || this.isLoggedIn);
  }

  get user() {
    return this.authService.getUser();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/home']);
  }
}
