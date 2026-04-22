import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NgForm } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ProfileService, UserProfile, UpdateProfileDto } from '../../core/services/profile.service';
import { FollowersService } from '../../core/services/followers.service';

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

  isOwnProfile = true;
  viewedUserId = '';
  viewedUsername = '';
  viewedRole = '';
  followed = false;
  followLoading = false;

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
    private followersService: FollowersService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const routeUserId = params.get('userId');
      const myUser = this.authService.getUser();

      if (routeUserId && routeUserId !== String(myUser?.id)) {
        this.isOwnProfile = false;
        this.viewedUserId = routeUserId;
        this.viewedUsername = this.route.snapshot.queryParamMap.get('username') ?? '';
        this.viewedRole = this.route.snapshot.queryParamMap.get('role') ?? '';
        this.loadProfile(Number(routeUserId));
        this.checkFollowStatus(routeUserId);
      } else {
        this.isOwnProfile = true;
        if (!myUser) return;
        this.loadProfile(myUser.id);
      }
    });
  }

  private loadProfile(userId: number): void {
    this.loading = true;
    this.profileService.getProfile(userId).subscribe({
      next: p => {
        this.profile = p;
        if (this.isOwnProfile) this.syncModel(p);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: err => {
        if (err.status === 404) {
          if (this.isOwnProfile) this.editMode = true;
        } else {
          this.errorMsg = 'Failed to load profile.';
        }
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private checkFollowStatus(userId: string): void {
    this.followersService.getFollowing().subscribe({
      next: list => {
        this.followed = list.some(u => u.userId === userId);
        this.cdr.detectChanges();
      }
    });
  }

  toggleFollow(): void {
    if (this.followLoading) return;
    this.followLoading = true;

    const action = this.followed
      ? this.followersService.unfollow(this.viewedUserId)
      : this.followersService.follow(this.viewedUserId, this.viewedUsername);

    action.subscribe({
      next: () => {
        this.followed = !this.followed;
        this.followLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.followLoading = false; this.cdr.detectChanges(); }
    });
  }

  get user() { return this.authService.getUser(); }

  get displayUsername(): string {
    return this.isOwnProfile ? (this.user?.username ?? '') : this.viewedUsername;
  }

  get displayRole(): string {
    return this.isOwnProfile ? (this.user?.role ?? '') : this.viewedRole;
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
