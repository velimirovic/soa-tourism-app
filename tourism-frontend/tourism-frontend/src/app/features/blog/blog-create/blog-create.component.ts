import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { marked } from 'marked';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { BlogService } from '../../../core/services/blog.service';

@Component({
  selector: 'app-blog-create',
  standalone: false,
  templateUrl: './blog-create.component.html',
  styleUrl: './blog-create.component.scss'
})
export class BlogCreateComponent implements OnInit {
  title = '';
  description = '';
  images: string[] = [];

  submitting = false;
  error = '';
  showPreview = false;

  editId: string | null = null;
  loading = false;

  constructor(
    private blogService: BlogService,
    private router: Router,
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.editId = this.route.snapshot.paramMap.get('id');
    if (this.editId) {
      this.loading = true;
      this.blogService.getBlog(this.editId).subscribe({
        next: (blog) => {
          this.title = blog.title;
          this.description = blog.description;
          this.images = [...blog.images];
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
  }

  get isEditMode(): boolean {
    return !!this.editId;
  }

  get renderedDescription(): SafeHtml {
    if (!this.description.trim()) {
      return this.sanitizer.bypassSecurityTrustHtml('<p style="color:#aaa">Preview will appear here…</p>');
    }
    const html = marked.parse(this.description) as string;
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    Array.from(input.files).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        this.images.push(reader.result as string);
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    });

    input.value = '';
  }

  removeImage(index: number): void {
    this.images.splice(index, 1);
  }

  submit(): void {
    if (!this.title.trim() || !this.description.trim()) {
      this.error = 'Title and description are required.';
      return;
    }

    this.submitting = true;
    this.error = '';

    const data = {
      title: this.title.trim(),
      description: this.description.trim(),
      images: this.images
    };

    const request$ = this.isEditMode
      ? this.blogService.updateBlog(this.editId!, data)
      : this.blogService.createBlog(data);

    request$.subscribe({
      next: (blog) => this.router.navigate(['/blogs', blog._id]),
      error: () => {
        this.error = this.isEditMode ? 'Failed to update blog.' : 'Failed to create blog. Please try again.';
        this.submitting = false;
      }
    });
  }

  cancel(): void {
    if (this.isEditMode) {
      this.router.navigate(['/blogs', this.editId]);
    } else {
      this.router.navigate(['/blogs']);
    }
  }
}
