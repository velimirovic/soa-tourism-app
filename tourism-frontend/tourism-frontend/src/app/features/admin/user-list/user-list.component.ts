import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { AdminService, UserDto } from '../../../core/services/admin.service';
import { TokenService } from '../../../core/services/token.service';

@Component({
  selector: 'app-user-list',
  standalone: false,
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.scss'
})
export class UserListComponent implements OnInit {

  users: UserDto[] = [];
  loading = true;
  error = '';
  currentUserId: number;

  constructor(
    private adminService: AdminService,
    private tokenService: TokenService,
    private cdr: ChangeDetectorRef
  ) {
    this.currentUserId = this.tokenService.getUser()?.id ?? 0;
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.adminService.getAllUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err?.error?.error ?? 'Failed to load users.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  toggleBlock(user: UserDto): void {
    this.adminService.toggleBlock(user.id).subscribe({
      next: (updated) => {
        const idx = this.users.findIndex(u => u.id === updated.id);
        if (idx !== -1) {
          this.users[idx] = updated;
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        alert(err?.error?.error ?? 'Failed to update user status.');
      }
    });
  }
}
