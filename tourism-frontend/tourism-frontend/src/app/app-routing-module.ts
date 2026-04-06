import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LoginComponent }      from './features/auth/login/login.component';
import { RegisterComponent }   from './features/auth/register/register.component';
import { ShellComponent }      from './features/layout/shell/shell.component';
import { HomeComponent }       from './features/home/home.component';
import { BlogListComponent }   from './features/blog/blog-list/blog-list.component';
import { BlogCreateComponent } from './features/blog/blog-create/blog-create.component';
import { BlogDetailComponent } from './features/blog/blog-detail/blog-detail.component';
import { AuthGuard }           from './core/guards/auth.guard';

const routes: Routes = [
  // Auth pages (standalone, no shell)
  { path: 'login',    component: LoginComponent },
  { path: 'register', component: RegisterComponent },

  // Shell
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: '',       redirectTo: 'home', pathMatch: 'full' },
      { path: 'home',   component: HomeComponent },

      // Blog routes — require login
      { path: 'blogs',        component: BlogListComponent,   canActivate: [AuthGuard] },
      { path: 'blogs/new',    component: BlogCreateComponent, canActivate: [AuthGuard] },
      { path: 'blogs/:id',    component: BlogDetailComponent, canActivate: [AuthGuard] },
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
