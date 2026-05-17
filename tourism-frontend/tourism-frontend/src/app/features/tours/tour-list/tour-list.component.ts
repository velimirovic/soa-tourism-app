import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import {
  TourService, TourDto, UpdateTourRequest,
  TourDurationDto, CreateTourDurationRequest
} from '../../../core/services/tour.service';

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

  // Durations modal
  durationsTour: TourDto | null = null;
  durations: TourDurationDto[] = [];
  durationsLoading = false;
  newTransportType: 'WALKING' | 'BICYCLE' | 'CAR' = 'WALKING';
  newDurationMinutes: number | null = null;
  durationError = '';
  durationSaving = false;

  // Status action state
  actioningId: number | null = null;

  readonly difficulties = ['EASY', 'MEDIUM', 'HARD'];
  readonly transportTypes: Array<'WALKING' | 'BICYCLE' | 'CAR'> = ['WALKING', 'BICYCLE', 'CAR'];

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

  goCreate(): void { this.router.navigate(['/tours/create']); }
  goKeyPoints(tourId: number): void { this.router.navigate(['/tours', tourId, 'keypoints']); }

  difficultyClass(difficulty: string): string { return difficulty?.toLowerCase() ?? 'easy'; }

  statusClass(status: string): string {
    switch (status) {
      case 'PUBLISHED': return 'published';
      case 'ARCHIVED':  return 'archived';
      default:          return 'draft';
    }
  }

  statusIcon(status: string): string {
    switch (status) {
      case 'PUBLISHED': return 'public';
      case 'ARCHIVED':  return 'inventory_2';
      default:          return 'edit_note';
    }
  }

  transportIcon(type: string): string {
    switch (type) {
      case 'BICYCLE': return 'directions_bike';
      case 'CAR':     return 'directions_car';
      default:        return 'directions_walk';
    }
  }

  transportLabel(type: string): string {
    switch (type) {
      case 'BICYCLE': return 'Bicikl';
      case 'CAR':     return 'Auto';
      default:        return 'Peške';
    }
  }

  // ── Status actions ──────────────────────────────────────────

  publish(tour: TourDto): void {
    this.actioningId = tour.id;
    this.tourService.publishTour(tour.id).subscribe({
      next: (updated) => this.replaceTour(updated),
      error: (err) => {
        alert(err?.error?.error ?? 'Could not publish tour.');
        this.actioningId = null;
        this.cdr.detectChanges();
      }
    });
  }

  archive(tour: TourDto): void {
    this.actioningId = tour.id;
    this.tourService.archiveTour(tour.id).subscribe({
      next: (updated) => this.replaceTour(updated),
      error: (err) => {
        alert(err?.error?.error ?? 'Could not archive tour.');
        this.actioningId = null;
        this.cdr.detectChanges();
      }
    });
  }

  activate(tour: TourDto): void {
    this.actioningId = tour.id;
    this.tourService.activateTour(tour.id).subscribe({
      next: (updated) => this.replaceTour(updated),
      error: (err) => {
        alert(err?.error?.error ?? 'Could not activate tour.');
        this.actioningId = null;
        this.cdr.detectChanges();
      }
    });
  }

  private replaceTour(updated: TourDto): void {
    const idx = this.tours.findIndex(t => t.id === updated.id);
    if (idx !== -1) this.tours[idx] = updated;
    this.actioningId = null;
    this.cdr.detectChanges();
  }

  // ── Edit modal ──────────────────────────────────────────────

  openEdit(tour: TourDto): void {
    this.editingTour   = tour;
    this.editName      = tour.name;
    this.editDescription = tour.description ?? '';
    this.editDifficulty  = tour.difficulty;
    this.editTags      = [...(tour.tags ?? [])];
    this.editTagInput  = '';
    this.editError     = '';
    this.editSaving    = false;
    this.cdr.detectChanges();
  }

  closeEdit(): void { this.editingTour = null; this.cdr.detectChanges(); }

  addEditTag(): void {
    const tag = this.editTagInput.trim().replace(/,$/, '');
    if (tag && !this.editTags.includes(tag)) this.editTags = [...this.editTags, tag];
    this.editTagInput = '';
  }

  removeEditTag(tag: string): void { this.editTags = this.editTags.filter(t => t !== tag); }

  onEditTagKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') { event.preventDefault(); this.addEditTag(); }
  }

  saveEdit(): void {
    if (!this.editingTour) return;
    if (!this.editName.trim())  { this.editError = 'Name is required.';       return; }
    if (!this.editDifficulty)   { this.editError = 'Difficulty is required.'; return; }

    this.editSaving = true;
    this.editError  = '';

    const req: UpdateTourRequest = {
      name:        this.editName.trim(),
      description: this.editDescription.trim(),
      difficulty:  this.editDifficulty,
      price:       this.editingTour.price,
      tags:        this.editTags
    };

    this.tourService.updateTour(this.editingTour.id, req).subscribe({
      next: (updated) => {
        this.replaceTour(updated);
        this.editSaving  = false;
        this.editingTour = null;
      },
      error: (err) => {
        this.editError  = err?.error?.error ?? 'Failed to update tour.';
        this.editSaving = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ── Durations modal ─────────────────────────────────────────

  openDurations(tour: TourDto): void {
    this.durationsTour    = tour;
    this.durations        = tour.durations ? [...tour.durations] : [];
    this.durationsLoading = false;
    this.newTransportType = 'WALKING';
    this.newDurationMinutes = null;
    this.durationError    = '';
    this.durationSaving   = false;
    this.cdr.detectChanges();
  }

  closeDurations(): void { this.durationsTour = null; this.cdr.detectChanges(); }

  addDuration(): void {
    if (!this.durationsTour) return;
    if (!this.newDurationMinutes || this.newDurationMinutes < 1) {
      this.durationError = 'Enter a valid duration (at least 1 minute).';
      return;
    }

    this.durationSaving = true;
    this.durationError  = '';

    const req: CreateTourDurationRequest = {
      transportType:      this.newTransportType,
      durationInMinutes:  this.newDurationMinutes
    };

    this.tourService.addDuration(this.durationsTour.id, req).subscribe({
      next: (d) => {
        this.durations = [...this.durations, d];
        // also update the tour card in the list
        const tour = this.tours.find(t => t.id === this.durationsTour!.id);
        if (tour) tour.durations = [...this.durations];
        this.newDurationMinutes = null;
        this.durationSaving = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.durationError  = err?.error?.error ?? 'Failed to add duration.';
        this.durationSaving = false;
        this.cdr.detectChanges();
      }
    });
  }
}
