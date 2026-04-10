import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { marked } from 'marked';
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

  readonly PAGE_SIZE = 9;
  currentPage = 1;
  confirmDeleteBlog: Blog | null = null;

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
