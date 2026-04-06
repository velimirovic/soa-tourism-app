import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BlogService, Blog } from '../../../core/services/blog.service';
import { AuthService } from '../../../core/services/auth.service';

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

  constructor(
    private blogService: BlogService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.blogService.getBlogs().subscribe({
      next: (blogs) => {
        this.blogs = blogs;
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

  get currentUserId(): string {
    return String(this.authService.getUser()?.id ?? '');
  }

  excerpt(description: string): string {
    const plain = description.replace(/[#*_`>\-\[\]!]/g, '').trim();
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

  createBlog(): void {
    this.router.navigate(['/blogs/new']);
  }
}
