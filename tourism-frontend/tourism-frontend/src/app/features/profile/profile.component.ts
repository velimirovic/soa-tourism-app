import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ProfileService, UserProfile, UpdateProfileDto } from '../../core/services/profile.service';

@Component({
  selector: 'app-profile',
  standalone: false,
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  profile: UserProfile | null = null;
  editMode = false;
  loading = false;
  saving = false;
  errorMsg = '';
  successMsg = '';

  model: UpdateProfileDto = {
    firstName: '',
    lastName: '',
    profilePicture: null,
    biography: null,
    motto: null
  };

  constructor(
    private authService: AuthService,
    private profileService: ProfileService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const user = this.authService.getUser();
    if (!user) return;

    this.loading = true;
    this.profileService.getProfile(user.id).subscribe({
      next: p => {
        this.profile = p;
        this.syncModel(p);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: err => {
        // Profil možda još ne postoji — dozvoljavamo edit
        if (err.status === 404) {
          this.editMode = true;
        } else {
          this.errorMsg = 'Failed to load profile.';
        }
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  get user() {
    return this.authService.getUser();
  }

  enterEdit(): void {
    if (this.profile) this.syncModel(this.profile);
    this.editMode = true;
    this.successMsg = '';
    this.errorMsg = '';
  }

  cancelEdit(): void {
    this.editMode = false;
    this.errorMsg = '';
  }

  onSubmit(form: NgForm): void {
    if (form.invalid) return;
    const user = this.authService.getUser();
    if (!user) return;

    this.saving = true;
    this.errorMsg = '';
    this.successMsg = '';

    this.profileService.updateProfile(user.id, this.model).subscribe({
      next: p => {
        this.profile = p;
        this.editMode = false;
        this.saving = false;
        this.successMsg = 'Profile updated successfully!';
        this.cdr.detectChanges();
      },
      error: () => {
        this.saving = false;
        this.errorMsg = 'Failed to save profile. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }

  private syncModel(p: UserProfile): void {
    this.model = {
      firstName: p.firstName,
      lastName: p.lastName,
      profilePicture: p.profilePicture,
      biography: p.biography,
      motto: p.motto
    };
  }

  onFileSelected(event: Event): void {
  const input = event.target as HTMLInputElement;
  if (!input.files?.length) return;

  const file = input.files[0];
  const reader = new FileReader();
  reader.onload = () => {
    this.model.profilePicture = reader.result as string;
    this.cdr.detectChanges();
  };
  reader.readAsDataURL(file);
}

}