import { Component, OnInit } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';
import { AdminService, UserDto } from '../../../core/services/admin.service';

@Component({
  selector: 'app-user-list',
  standalone: false,
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.scss'
})
export class UserListComponent implements OnInit {

  users$!: Observable<UserDto[]>;
  error = '';

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.users$ = this.adminService.getAllUsers().pipe(
      catchError(err => {
        this.error = err?.error?.error ?? 'Failed to load users.';
        return of([]);
      })
    );
  }
}
