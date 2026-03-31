import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LoginComponent }     from './features/auth/login/login.component';
import { RegisterComponent }  from './features/auth/register/register.component';
import { ShellComponent }     from './features/layout/shell/shell.component';
import { HomeComponent }      from './features/home/home.component';
import { UserListComponent }  from './features/admin/user-list/user-list.component';
import { AdminGuard }         from './core/guards/admin.guard';
import { ProfileComponent } from './features/profile/profile.component';

const routes: Routes = [
  // Auth pages (standalone, no shell)
  { path: 'login',    component: LoginComponent },
  { path: 'register', component: RegisterComponent },

  // Public shell — home accessible to everyone
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: '',     redirectTo: 'home', pathMatch: 'full' },
      { path: 'home', component: HomeComponent },
      { path: 'profile', component: ProfileComponent },
      { path: 'admin/users',   component: UserListComponent, canActivate: [AdminGuard] }
    ]
  },

  // Fallback
  { path: '**', redirectTo: 'home' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
