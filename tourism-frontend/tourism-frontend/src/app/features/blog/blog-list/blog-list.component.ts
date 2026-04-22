import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { marked } from 'marked';
import { BlogService, Blog } from '../../../core/services/blog.service';
import { AuthService } from '../../../core/services/auth.service';
import { FollowersService } from '../../../core/services/followers.service';

@Component({
  selector: 'app-blog-list',
  standalone: false,
  templateUrl: './blog-list.component.html',
  styleUrl: './blog-list.component.scss'
})
export class BlogListComponent implements OnInit {
  blogs: Blog[] = [];
  loading = true;
  error = '';
  mode: 'all' | 'feed' | 'mine' = 'all';
  followingIds = new Set<string>();

  readonly PAGE_SIZE = 9;
  currentPage = 1;
  confirmDeleteBlog: Blog | null = null;

  constructor(
    private blogService: BlogService,
    private authService: AuthService,
    private followersService: FollowersService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.followersService.getFollowing().subscribe({
      next: (list) => {
        this.followingIds = new Set(list.map((u) => u.userId));
        this.cdr.detectChanges();
      }
    });
    this.loadBlogs();
  }

  loadBlogs(): void {
    this.loading = true;
    this.error = '';
    const obs = this.mode === 'feed' ? this.blogService.getFeed()
              : this.mode === 'mine' ? this.blogService.getMyBlogs()
              : this.blogService.getBlogs();
    obs.subscribe({
      next: (blogs) => {
        this.blogs = this.mode === 'all'
          ? blogs.filter(b => b.authorId !== this.currentUserId)
          : blogs;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Failed to load blogs.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  switchMode(mode: 'all' | 'feed' | 'mine'): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.currentPage = 1;
    this.loadBlogs();
  }

  isFollowing(authorId: string): boolean {
    return this.followingIds.has(authorId);
  }

  toggleFollow(event: Event, blog: Blog): void {
    event.stopPropagation();
    if (this.isFollowing(blog.authorId)) {
      this.followersService.unfollow(blog.authorId).subscribe({
        next: () => {
          this.followingIds.delete(blog.authorId);
          this.cdr.detectChanges();
        }
      });
    } else {
      this.followersService.follow(blog.authorId, blog.authorUsername).subscribe({
        next: () => {
          this.followingIds.add(blog.authorId);
          this.cdr.detectChanges();
        }
      });
    }
  }

  get currentUserId(): string {
    return String(this.authService.getUser()?.id ?? '');
  }

  get totalPages(): number {
    return Math.ceil(this.blogs.length / this.PAGE_SIZE);
  }

  get pagedBlogs(): Blog[] {
    const start = (this.currentPage - 1) * this.PAGE_SIZE;
    return this.blogs.slice(start, start + this.PAGE_SIZE);
  }

  setPage(page: number): void {
    this.currentPage = page;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  excerpt(description: string): string {
    const html = marked.parse(description) as string;
    const plain = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return plain.length > 160 ? plain.slice(0, 160) + '…' : plain;
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('sr-RS', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  openBlog(id: string): void {
    this.router.navigate(['/blogs', id]);
  }

  editBlog(event: Event, blog: Blog): void {
    event.stopPropagation();
    this.router.navigate(['/blogs', blog._id, 'edit']);
  }

  requestDeleteBlog(event: Event, blog: Blog): void {
    event.stopPropagation();
    this.confirmDeleteBlog = blog;
  }

  cancelDelete(): void {
    this.confirmDeleteBlog = null;
  }

  confirmDelete(): void {
    const blog = this.confirmDeleteBlog;
    if (!blog) return;
    this.confirmDeleteBlog = null;
    this.blogService.deleteBlog(blog._id).subscribe({
      next: () => {
        this.blogs = this.blogs.filter(b => b._id !== blog._id);
        if (this.currentPage > this.totalPages && this.currentPage > 1) {
          this.currentPage--;
        }
        this.cdr.detectChanges();
      }
    });
  }

  createBlog(): void {
    this.router.navigate(['/blogs/new']);
  }
}
