import { ChangeDetectorRef, Component } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  model = { username: '', password: '' };
  showPassword = false;
  loading  = false;
  errorMsg = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  onSubmit(form: NgForm): void {
    if (form.invalid) return;

    this.loading  = true;
    this.errorMsg = '';

    this.authService.login(this.model).subscribe({
      next: () => this.router.navigate(['/home']),
      error: err => {
        this.loading = false;

        if (err.status === 401) {
          this.errorMsg = 'Incorrect username or password.';
        } else if (err.status === 403) {
          this.errorMsg = 'Your account has been blocked. Please contact support.';
        } else if (err.status === 0) {
          this.errorMsg = 'Cannot reach the server. Please check your connection.';
        } else {
          this.errorMsg = 'Something went wrong. Please try again.';
        }

        // Prisiljavamo Angular da odmah osvijezi view
        this.cdr.detectChanges();
      }
    });
  }
}
