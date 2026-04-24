import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';

import { AppRoutingModule }  from './app-routing-module';
import { App }               from './app';

// Core
import { AuthInterceptor }   from './core/interceptors/auth.interceptor';

// Layout
import { ShellComponent }    from './features/layout/shell/shell.component';
import { SidebarComponent }  from './features/layout/sidebar/sidebar.component';

// Auth
import { LoginComponent }    from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';

// Pages
import { HomeComponent }          from './features/home/home.component';
import { BlogListComponent }      from './features/blog/blog-list/blog-list.component';
import { BlogCreateComponent }    from './features/blog/blog-create/blog-create.component';
import { BlogDetailComponent }    from './features/blog/blog-detail/blog-detail.component';
import { UserListComponent } from './features/admin/user-list/user-list.component';

//Profile
import { ProfileComponent } from './features/profile/profile.component';
import { PeopleComponent }  from './features/people/people.component';

// Tours
import { TourListComponent }   from './features/tours/tour-list/tour-list.component';
import { CreateTourComponent } from './features/tours/create-tour/create-tour.component';

@NgModule({
  declarations: [
    App,
    ShellComponent,
    SidebarComponent,
    LoginComponent,
    RegisterComponent,
    HomeComponent,
    BlogListComponent,
    BlogCreateComponent,
    BlogDetailComponent,
    ProfileComponent,
    UserListComponent,
    PeopleComponent,
    TourListComponent,
    CreateTourComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule,
    AppRoutingModule
  ],
  providers: [
    provideBrowserGlobalErrorListeners(),
    {
      provide:  HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi:    true
    }
  ],
  bootstrap: [App]
})
export class AppModule { }
