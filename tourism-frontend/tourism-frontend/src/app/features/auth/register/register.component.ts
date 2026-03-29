import { ChangeDetectorRef, Component } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: false,
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  model = {
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'Tourist'
  };

  showPassword = false;
  showConfirm  = false;
  loading      = false;
  errorMsg     = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  onSubmit(form: NgForm): void {
    if (form.invalid) return;

    if (this.model.password !== this.model.confirmPassword) {
      this.errorMsg = 'Passwords do not match.';
      return;
    }

    this.loading  = true;
    this.errorMsg = '';

    this.authService.register({
      username: this.model.username,
      email:    this.model.email,
      password: this.model.password,
      role:     this.model.role
    }).subscribe({
      next: () => this.router.navigate(['/home']),
      error: err => {
        this.loading = false;

        if (err.status === 409) {
          this.errorMsg = 'Username or email is already taken.';
        } else if (err.status === 400) {
          this.errorMsg = 'Please check the form — some fields are invalid.';
        } else if (err.status === 0) {
          this.errorMsg = 'Cannot reach the server. Please check your connection.';
        } else {
          this.errorMsg = 'Registration failed. Please try again.';
        }

        // Prisiljavamo Angular da odmah osvijezi view
        this.cdr.detectChanges();
      }
    });
  }
}
