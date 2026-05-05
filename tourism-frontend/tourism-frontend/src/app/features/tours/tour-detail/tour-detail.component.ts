import { AfterViewInit, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import * as L from 'leaflet';
import {
  TourService, TourDto, KeyPointDto,
  ReviewDto, CreateReviewRequest
} from '../../../core/services/tour.service';
import { AuthService } from '../../../core/services/auth.service';

const iconDefault = L.icon({
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize:    [25, 41],
  iconAnchor:  [12, 41],
  popupAnchor: [1, -34],
  shadowSize:  [41, 41]
});
L.Marker.prototype.options.icon = iconDefault;

@Component({
  selector: 'app-tour-detail',
  standalone: false,
  templateUrl: './tour-detail.component.html',
  styleUrl: './tour-detail.component.scss'
})
export class TourDetailComponent implements OnInit, AfterViewInit, OnDestroy {

  tour: TourDto | null = null;
  keyPoints: KeyPointDto[] = [];
  reviews: ReviewDto[] = [];
  loading = true;
  error = '';

  // Review form
  reviewRating = 5;
  reviewComment = '';
  reviewVisitDate = '';
  reviewImages: string[] = [];
  reviewError = '';
  reviewSubmitting = false;
  reviewImageFileName = '';

  private map!: L.Map;
  private polyline: L.Polyline | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tourService: TourService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.tourService.getTour(id).subscribe({
      next: (tour) => {
        this.tour = tour;
        this.loadKeyPointsAndReviews(id);
      },
      error: () => {
        this.error = 'Tour not found.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {
    if (this.map) this.map.remove();
  }

  private loadKeyPointsAndReviews(tourId: number): void {
    this.tourService.getKeyPoints(tourId).subscribe({
      next: (kps) => {
        this.keyPoints = kps;
        this.renderMap();
        this.tourService.getReviews(tourId).subscribe({
          next: (reviews) => {
            this.reviews = reviews;
            this.loading = false;
            this.cdr.detectChanges();
          },
          error: () => {
            this.loading = false;
            this.cdr.detectChanges();
          }
        });
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private initMap(): void {
    this.map = L.map('td-map', { center: [44.8, 20.5], zoom: 7 });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);
    if (this.keyPoints.length > 0) this.renderMap();
  }

  private renderMap(): void {
    if (!this.map) return;

    if (this.polyline) { this.map.removeLayer(this.polyline); this.polyline = null; }

    this.keyPoints.forEach((kp, i) => {
      const icon = L.divIcon({
        className: '',
        html: `<div class="td-marker">${i + 1}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });
      L.marker([kp.latitude, kp.longitude], { icon })
        .addTo(this.map)
        .bindPopup(`
          <strong>${kp.name}</strong><br/>
          ${kp.description || ''}
          ${kp.imageUrl ? `<br/><img src="${kp.imageUrl}" style="max-width:160px;margin-top:6px;border-radius:6px;"/>` : ''}
        `);
    });

    if (this.keyPoints.length >= 2) {
      const latlngs = this.keyPoints.map(kp => [kp.latitude, kp.longitude] as L.LatLngTuple);
      this.polyline = L.polyline(latlngs, { color: '#a855f7', weight: 3, dashArray: '6,6' })
        .addTo(this.map);
    }

    if (this.keyPoints.length > 0) {
      const bounds = L.latLngBounds(this.keyPoints.map(kp => [kp.latitude, kp.longitude]));
      this.map.fitBounds(bounds, { padding: [40, 40] });
    }
  }

  stars(n: number): number[] { return Array.from({ length: n }, (_, i) => i + 1); }

  difficultyClass(d: string): string { return d?.toLowerCase() ?? 'easy'; }

  get isTourist(): boolean { return this.authService.getUser()?.role === 'Tourist'; }

  onReviewImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.reviewImageFileName = file.name;
    const reader = new FileReader();
    reader.onload = () => {
      this.reviewImages = [reader.result as string];
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  clearReviewImage(): void { this.reviewImages = []; this.reviewImageFileName = ''; }

  submitReview(): void {
    if (!this.tour) return;
    if (!this.reviewVisitDate) { this.reviewError = 'Visit date is required.'; return; }

    this.reviewSubmitting = true;
    this.reviewError = '';

    const user = this.authService.getUser();
    const req: CreateReviewRequest = {
      rating:      this.reviewRating,
      comment:     this.reviewComment.trim(),
      touristName: user?.username ?? '',
      visitDate:   this.reviewVisitDate,
      images:      this.reviewImages
    };

    this.tourService.addReview(this.tour.id, req).subscribe({
      next: (r) => {
        this.reviews = [r, ...this.reviews];
        this.reviewRating = 5;
        this.reviewComment = '';
        this.reviewVisitDate = '';
        this.reviewImages = [];
        this.reviewImageFileName = '';
        this.reviewSubmitting = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.reviewError = err?.error?.error ?? 'Failed to submit review.';
        this.reviewSubmitting = false;
        this.cdr.detectChanges();
      }
    });
  }

  goBack(): void { this.router.navigate(['/tours']); }
}
