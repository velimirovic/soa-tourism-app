import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FollowersService, FollowUser, Recommendation } from '../../core/services/followers.service';
import { AdminService, PublicUserDto } from '../../core/services/admin.service';
import { AuthService } from '../../core/services/auth.service';

const AVATAR_PALETTE = ['#a855f7','#8b5cf6','#6366f1','#3b82f6','#06b6d4','#10b981','#f59e0b','#f97316','#ec4899'];

@Component({
  selector: 'app-people',
  standalone: false,
  templateUrl: './people.component.html',
  styleUrls: ['./people.component.scss'],
})
export class PeopleComponent implements OnInit {
  following: FollowUser[] = [];
  recommendations: Recommendation[] = [];
  discoverUsers: PublicUserDto[] = [];
  loading = true;
  showAllRec = false;

  constructor(
    private followersService: FollowersService,
    private adminService: AdminService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadFollowing();
    this.loadRecommendations();
    this.loadDiscoverUsers();
  }

  get filteredDiscoverUsers(): PublicUserDto[] {
    return this.discoverUsers.filter(u => !this.isFollowing(u.id));
  }

  get visibleRecommendations(): Recommendation[] {
    return this.showAllRec ? this.recommendations : this.recommendations.slice(0, 5);
  }

  private loadFollowing(): void {
    this.followersService.getFollowing().subscribe({
      next: (list) => { this.following = list; this.cdr.detectChanges(); },
      error: () => this.cdr.detectChanges()
    });
  }

  private loadRecommendations(): void {
    this.followersService.getRecommendations().subscribe({
      next: (list) => { this.recommendations = list; this.loading = false; this.cdr.detectChanges(); },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  private loadDiscoverUsers(): void {
    const myId = String(this.authService.getUser()?.id ?? '');
    this.adminService.getDiscoverUsers().subscribe({
      next: (users) => {
        this.discoverUsers = users.filter(u => u.id !== myId);
        this.profilePictures = new Map(users.map(u => [u.id, u.profilePicture ?? null]));
        this.cdr.detectChanges();
      },
      error: () => this.cdr.detectChanges()
    });
  }

  profilePictureOf(userId: string): string | null {
    return this.profilePictures.get(userId) ?? null;
  }

  private profilePictures = new Map<string, string | null>();

  isFollowing(userId: string): boolean {
    return this.following.some(u => u.userId === userId);
  }

  follow(user: { userId?: string; id?: string; username: string }): void {
    const userId = user.userId ?? user.id ?? '';
    this.followersService.follow(userId, user.username).subscribe({
      next: () => {
        if (!this.isFollowing(userId)) {
          this.following = [...this.following, { userId, username: user.username }];
        }
        this.recommendations = this.recommendations.filter(r => r.userId !== userId);
        this.cdr.detectChanges();
      }
    });
  }

  unfollow(user: FollowUser): void {
    this.followersService.unfollow(user.userId).subscribe({
      next: () => { this.following = this.following.filter(u => u.userId !== user.userId); this.cdr.detectChanges(); }
    });
  }

  avatarColor(username: string): string {
    let hash = 0;
    for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
  }

  initials(username: string): string {
    const parts = username.replace(/[_.\-]/g, ' ').split(' ').filter(Boolean);
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : username.slice(0, 2).toUpperCase();
  }
}
