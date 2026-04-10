import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { marked } from 'marked';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { BlogService, Blog, Comment } from '../../../core/services/blog.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-blog-detail',
  standalone: false,
  templateUrl: './blog-detail.component.html',
  styleUrl: './blog-detail.component.scss'
})
export class BlogDetailComponent implements OnInit {
  blog: Blog | null = null;
  loading = true;
  error = '';

  commentText = '';
  commentError = '';
  commentSubmitting = false;

  editingCommentId: string | null = null;
  editingCommentText = '';

  likesCount = 0;
  liked = false;
  showDeleteConfirm = false;

  readonly COMMENT_MAX_LENGTH = 500;
  readonly PAGE_SIZE = 7;
  commentPage = 1;
  confirmDeleteComment: Comment | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private blogService: BlogService,
    private authService: AuthService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.blogService.getBlog(id).subscribe({
      next: (blog) => {
        this.blog = blog;
        this.likesCount = blog.likes.length;
        this.liked = blog.likes.includes(this.currentUserId);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Failed to load blog.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  get currentUserId(): string {
    return String(this.authService.getUser()?.id ?? '');
  }

  get currentUsername(): string {
    return this.authService.getUser()?.username ?? '';
  }

  get renderedDescription(): SafeHtml {
    if (!this.blog?.description) return '';
    const html = marked.parse(this.blog.description) as string;
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('sr-RS', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  toggleLike(): void {
    if (!this.blog) return;
    this.blogService.toggleLike(this.blog._id).subscribe({
      next: (res) => {
        this.likesCount = res.likes;
        this.liked = res.liked;
        this.cdr.detectChanges();
      }
    });
  }

  get pagedComments(): Comment[] {
    if (!this.blog) return [];
    const start = (this.commentPage - 1) * this.PAGE_SIZE;
    return this.blog.comments.slice(start, start + this.PAGE_SIZE);
  }

  get totalPages(): number {
    return Math.ceil((this.blog?.comments.length ?? 0) / this.PAGE_SIZE);
  }

  setPage(page: number): void {
    this.commentPage = page;
    this.cdr.detectChanges();
  }

  submitComment(): void {
    if (!this.blog || !this.commentText.trim()) return;
    this.commentSubmitting = true;
    this.commentError = '';

    this.blogService.addComment(this.blog._id, this.commentText.trim()).subscribe({
      next: (comment) => {
        this.blog!.comments.push(comment);
        this.commentPage = this.totalPages;
        this.commentText = '';
        this.commentSubmitting = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.commentError = 'Failed to post comment.';
        this.commentSubmitting = false;
        this.cdr.detectChanges();
      }
    });
  }

  startEditComment(comment: Comment): void {
    this.editingCommentId = comment._id;
    this.editingCommentText = comment.text;
  }

  cancelEditComment(): void {
    this.editingCommentId = null;
    this.editingCommentText = '';
  }

  saveEditComment(comment: Comment): void {
    if (!this.blog || !this.editingCommentText.trim()) return;
    this.blogService.updateComment(this.blog._id, comment._id, this.editingCommentText.trim()).subscribe({
      next: (updated) => {
        comment.text = updated.text;
        comment.updatedAt = updated.updatedAt;
        this.editingCommentId = null;
        this.cdr.detectChanges();
      }
    });
  }

  requestDeleteComment(comment: Comment): void {
    this.confirmDeleteComment = comment;
  }

  cancelDeleteComment(): void {
    this.confirmDeleteComment = null;
  }

  confirmDelete(): void {
    const comment = this.confirmDeleteComment;
    if (!this.blog || !comment) return;
    this.confirmDeleteComment = null;
    this.blogService.deleteComment(this.blog._id, comment._id).subscribe({
      next: () => {
        this.blog!.comments = this.blog!.comments.filter(c => c._id !== comment._id);
        if (this.commentPage > this.totalPages && this.commentPage > 1) {
          this.commentPage--;
        }
        this.cdr.detectChanges();
      }
    });
  }

  editBlog(): void {
    if (!this.blog) return;
    this.router.navigate(['/blogs', this.blog._id, 'edit']);
  }

  requestDeleteBlog(): void {
    this.showDeleteConfirm = true;
  }

  cancelDeleteBlog(): void {
    this.showDeleteConfirm = false;
  }

  confirmDeleteBlog(): void {
    if (!this.blog) return;
    this.showDeleteConfirm = false;
    this.blogService.deleteBlog(this.blog._id).subscribe({
      next: () => this.router.navigate(['/blogs'])
    });
  }

  goBack(): void {
    this.router.navigate(['/blogs']);
  }
}
