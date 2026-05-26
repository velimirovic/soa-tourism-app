import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { TourService, TourDto, UpdateTourRequest } from '../../../core/services/tour.service';

@Component({
  selector: 'app-tour-list',
  standalone: false,
  templateUrl: './tour-list.component.html',
  styleUrl: './tour-list.component.scss'
})
export class TourListComponent implements OnInit {

  tours: TourDto[] = [];
  loading = true;
  error = '';

  // Edit modal
  editingTour: TourDto | null = null;
  editName = '';
  editDescription = '';
  editDifficulty = '';
  editTagInput = '';
  editTags: string[] = [];
  editError = '';
  editSaving = false;

  difficulties = ['EASY', 'MEDIUM', 'HARD'];

  constructor(
    private tourService: TourService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadTours();
  }

  loadTours(): void {
    this.loading = true;
    this.error = '';
    this.tourService.getMyTours().subscribe({
      next: (tours) => {
        this.tours = tours;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err?.error?.error ?? 'Failed to load tours.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  goCreate(): void {
    this.router.navigate(['/tours/create']);
  }

  goKeyPoints(tourId: number): void {
    this.router.navigate(['/tours', tourId, 'keypoints']);
  }

  difficultyClass(difficulty: string): string {
    return difficulty?.toLowerCase() ?? 'easy';
  }

  // ── Edit modal ──────────────────────────────────────────────
  openEdit(tour: TourDto): void {
    this.editingTour = tour;
    this.editName = tour.name;
    this.editDescription = tour.description ?? '';
    this.editDifficulty = tour.difficulty;
    this.editTags = [...(tour.tags ?? [])];
    this.editTagInput = '';
    this.editError = '';
    this.editSaving = false;
    this.cdr.detectChanges();
  }

  closeEdit(): void {
    this.editingTour = null;
    this.cdr.detectChanges();
  }

  addEditTag(): void {
    const tag = this.editTagInput.trim().replace(/,$/, '');
    if (tag && !this.editTags.includes(tag)) {
      this.editTags = [...this.editTags, tag];
    }
    this.editTagInput = '';
  }

  removeEditTag(tag: string): void {
    this.editTags = this.editTags.filter(t => t !== tag);
  }

  onEditTagKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.addEditTag();
    }
  }

  saveEdit(): void {
    if (!this.editingTour) return;
    if (!this.editName.trim()) { this.editError = 'Name is required.'; return; }
    if (!this.editDifficulty)  { this.editError = 'Difficulty is required.'; return; }

    this.editSaving = true;
    this.editError = '';

    const req: UpdateTourRequest = {
      name:        this.editName.trim(),
      description: this.editDescription.trim(),
      difficulty:  this.editDifficulty,
      price:       this.editingTour.price,
      tags:        this.editTags
    };

    this.tourService.updateTour(this.editingTour.id, req).subscribe({
      next: (updated) => {
        const idx = this.tours.findIndex(t => t.id === updated.id);
        if (idx !== -1) this.tours[idx] = updated;
        this.editSaving = false;
        this.editingTour = null;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.editError = err?.error?.error ?? 'Failed to update tour.';
        this.editSaving = false;
        this.cdr.detectChanges();
      }
    });
  }
}
