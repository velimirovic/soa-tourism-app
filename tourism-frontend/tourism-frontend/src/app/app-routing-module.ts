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
import { UserListComponent }   from './features/admin/user-list/user-list.component';
import { AdminGuard }          from './core/guards/admin.guard';
import { GuideGuard }          from './core/guards/guide.guard';
import { ProfileComponent }    from './features/profile/profile.component';
import { PeopleComponent }     from './features/people/people.component';
import { TourListComponent }       from './features/tours/tour-list/tour-list.component';
import { CreateTourComponent }     from './features/tours/create-tour/create-tour.component';
import { KeyPointsComponent }      from './features/tours/key-points/key-points.component';
import { TourPublicListComponent } from './features/tours/tour-public-list/tour-public-list.component';

const routes: Routes = [
  { path: 'login',    component: LoginComponent },
  { path: 'register', component: RegisterComponent },

  {
    path: '',
    component: ShellComponent,
    children: [
      { path: '',     redirectTo: 'home', pathMatch: 'full' },
      { path: 'home', component: HomeComponent },

      { path: 'blogs',          component: BlogListComponent,   canActivate: [AuthGuard] },
      { path: 'blogs/new',      component: BlogCreateComponent, canActivate: [AuthGuard] },
      { path: 'blogs/:id/edit', component: BlogCreateComponent, canActivate: [AuthGuard] },
      { path: 'blogs/:id',      component: BlogDetailComponent, canActivate: [AuthGuard] },

      { path: 'profile',          component: ProfileComponent, canActivate: [AuthGuard] },
      { path: 'profile/:userId',  component: ProfileComponent, canActivate: [AuthGuard] },
      { path: 'people',           component: PeopleComponent,  canActivate: [AuthGuard] },

      { path: 'admin/users', component: UserListComponent, canActivate: [AdminGuard] },

      // Guide-only: list of own tours, create, key points
      { path: 'tours/my',            component: TourListComponent,   canActivate: [AuthGuard, GuideGuard] },
      { path: 'tours/create',        component: CreateTourComponent, canActivate: [AuthGuard, GuideGuard] },
      { path: 'tours/:id/keypoints', component: KeyPointsComponent,  canActivate: [AuthGuard, GuideGuard] },

      // Tourist (and any authenticated user): public tour list
      { path: 'tours', component: TourPublicListComponent, canActivate: [AuthGuard] },
    ]
  },

  { path: '**', redirectTo: 'home' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
