import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { TourService, TourDto } from '../../../core/services/tour.service';

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

  difficultyClass(difficulty: string): string {
    return difficulty?.toLowerCase() ?? 'easy';
  }
}
