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
import { HomeComponent }     from './features/home/home.component';
import { UserListComponent } from './features/admin/user-list/user-list.component';

@NgModule({
  declarations: [
    App,
    ShellComponent,
    SidebarComponent,
    LoginComponent,
    RegisterComponent,
    HomeComponent,
    UserListComponent
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
