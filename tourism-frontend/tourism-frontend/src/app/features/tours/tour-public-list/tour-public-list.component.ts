import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { TourService, TourDto } from '../../../core/services/tour.service';

@Component({
  selector: 'app-tour-public-list',
  standalone: false,
  templateUrl: './tour-public-list.component.html',
  styleUrl: './tour-public-list.component.scss'
})
export class TourPublicListComponent implements OnInit {

  tours: TourDto[] = [];
  loading = true;
  error = '';

  constructor(
    private tourService: TourService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.tourService.getAllTours().subscribe({
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

  difficultyClass(difficulty: string): string {
    return difficulty?.toLowerCase() ?? 'easy';
  }

  goToDetail(tourId: number): void {
    this.router.navigate(['/tours', tourId]);
  }
}
