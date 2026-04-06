import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { marked } from 'marked';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { BlogService } from '../../../core/services/blog.service';

@Component({
  selector: 'app-blog-create',
  standalone: false,
  templateUrl: './blog-create.component.html',
  styleUrl: './blog-create.component.scss'
})
export class BlogCreateComponent {
  title = '';
  description = '';
  imageInput = '';
  images: string[] = [];

  submitting = false;
  error = '';
  showPreview = false;

  constructor(
    private blogService: BlogService,
    private router: Router,
    private sanitizer: DomSanitizer
  ) {}

  get renderedDescription(): SafeHtml {
    if (!this.description.trim()) {
      return this.sanitizer.bypassSecurityTrustHtml('<p style="color:#aaa">Preview will appear here…</p>');
    }
    const html = marked.parse(this.description) as string;
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  addImage(): void {
    const url = this.imageInput.trim();
    if (url && !this.images.includes(url)) {
      this.images.push(url);
    }
    this.imageInput = '';
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

    this.blogService.createBlog({
      title: this.title.trim(),
      description: this.description.trim(),
      images: this.images
    }).subscribe({
      next: (blog) => this.router.navigate(['/blogs', blog._id]),
      error: () => {
        this.error = 'Failed to create blog. Please try again.';
        this.submitting = false;
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/blogs']);
  }
}
