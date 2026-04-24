import { Component, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { TourService } from '../../../core/services/tour.service';

@Component({
  selector: 'app-create-tour',
  standalone: false,
  templateUrl: './create-tour.component.html',
  styleUrl: './create-tour.component.scss'
})
export class CreateTourComponent {

  name = '';
  description = '';
  difficulty = '';
  price: number = 0;
  tagInput = '';
  tags: string[] = [];

  submitting = false;
  error = '';
  success = false;

  difficulties = ['EASY', 'MEDIUM', 'HARD'];

  constructor(
    private tourService: TourService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  addTag(): void {
    const tag = this.tagInput.trim().replace(/,$/, '');
    if (tag && !this.tags.includes(tag)) {
      this.tags = [...this.tags, tag];
    }
    this.tagInput = '';
  }

  removeTag(tag: string): void {
    this.tags = this.tags.filter(t => t !== tag);
  }

  onTagInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.addTag();
    }
  }

  cancel(): void {
    this.router.navigate(['/tours/my']);
  }

  submit(): void {
    if (!this.name.trim()) {
      this.error = 'Tour name is required.';
      this.cdr.detectChanges();
      return;
    }
    if (!this.difficulty) {
      this.error = 'Please select a difficulty level.';
      this.cdr.detectChanges();
      return;
    }

    this.submitting = true;
    this.error = '';
    this.success = false;

    this.tourService.createTour({
      name: this.name.trim(),
      description: this.description.trim(),
      difficulty: this.difficulty,
      price: this.price ?? 0,
      tags: this.tags
    }).subscribe({
      next: () => {
        this.submitting = false;
        this.success = true;
        this.cdr.detectChanges();
        setTimeout(() => this.router.navigate(['/tours/my']), 1200);
      },
      error: (err) => {
        this.submitting = false;
        this.error = err?.error?.error ?? 'Failed to create tour. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }
}
