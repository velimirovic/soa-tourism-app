import { AfterViewInit, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import * as L from 'leaflet';
import { TourService, TourDto, KeyPointDto, CreateKeyPointRequest } from '../../../core/services/tour.service';

// Fix leaflet default marker icon paths broken by webpack
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
  selector: 'app-key-points',
  standalone: false,
  templateUrl: './key-points.component.html',
  styleUrl: './key-points.component.scss'
})
export class KeyPointsComponent implements OnInit, AfterViewInit, OnDestroy {

  tour: TourDto | null = null;
  tourId!: number;
  keyPoints: KeyPointDto[] = [];
  loading = true;
  error = '';

  // Form
  name = '';
  description = '';
  imageBase64 = '';
  imageFileName = '';
  latitude: number | null = null;
  longitude: number | null = null;
  formError = '';
  submitting = false;

  // Delete state
  deletingId: number | null = null;

  private map!: L.Map;
  private selectedMarker: L.Marker | null = null;
  private kpMarkers: L.Marker[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tourService: TourService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.tourId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadKeyPoints();
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {
    if (this.map) this.map.remove();
  }

  private initMap(): void {
    this.map = L.map('kp-map', {
      center: [44.8, 20.5],
      zoom: 7
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.latitude  = parseFloat(e.latlng.lat.toFixed(6));
      this.longitude = parseFloat(e.latlng.lng.toFixed(6));

      if (this.selectedMarker) this.map.removeLayer(this.selectedMarker);
      this.selectedMarker = L.marker([this.latitude, this.longitude])
        .addTo(this.map)
        .bindPopup('Selected location')
        .openPopup();

      this.cdr.detectChanges();
    });
  }

  private loadKeyPoints(): void {
    this.loading = true;
    this.tourService.getKeyPoints(this.tourId).subscribe({
      next: (kps) => {
        this.keyPoints = kps;
        this.loading = false;
        this.cdr.detectChanges();
        this.renderKpMarkers();
      },
      error: () => {
        this.error = 'Failed to load key points.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private renderKpMarkers(): void {
    if (!this.map) return;
    this.kpMarkers.forEach(m => this.map.removeLayer(m));
    this.kpMarkers = [];

    this.keyPoints.forEach((kp, i) => {
      const icon = L.divIcon({
        className: '',
        html: `<div class="kp-number-icon">${i + 1}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([kp.latitude, kp.longitude], { icon })
        .addTo(this.map)
        .bindPopup(`
          <strong>${kp.name}</strong><br/>
          ${kp.description || ''}
          ${kp.imageUrl ? `<br/><img src="${kp.imageUrl}" style="max-width:160px;margin-top:6px;border-radius:6px;"/>` : ''}
        `);
      this.kpMarkers.push(marker);
    });

    if (this.keyPoints.length > 0) {
      const bounds = L.latLngBounds(this.keyPoints.map(kp => [kp.latitude, kp.longitude]));
      this.map.fitBounds(bounds, { padding: [40, 40] });
    }
  }

  // ── Image upload via FileReader ────────────────────────────────
  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.imageFileName = file.name;
    const reader = new FileReader();
    reader.onload = () => {
      this.imageBase64 = reader.result as string;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  clearImage(): void {
    this.imageBase64 = '';
    this.imageFileName = '';
  }

  // ── Submit new key point ────────────────────────────────────────
  submit(): void {
    if (!this.name.trim()) { this.formError = 'Name is required.'; return; }
    if (this.latitude === null || this.longitude === null) {
      this.formError = 'Please click on the map to select a location.';
      return;
    }

    this.submitting = true;
    this.formError = '';

    const req: CreateKeyPointRequest = {
      name:        this.name.trim(),
      description: this.description.trim(),
      imageUrl:    this.imageBase64,
      latitude:    this.latitude,
      longitude:   this.longitude
    };

    this.tourService.addKeyPoint(this.tourId, req).subscribe({
      next: (kp) => {
        this.keyPoints = [...this.keyPoints, kp];
        this.submitting = false;
        this.resetForm();
        this.cdr.detectChanges();
        this.renderKpMarkers();
      },
      error: () => {
        this.formError = 'Failed to add key point.';
        this.submitting = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ── Delete key point with renumbering ──────────────────────────
  deleteKeyPoint(kpId: number): void {
    if (this.deletingId !== null) return;
    this.deletingId = kpId;

    this.tourService.deleteKeyPoint(this.tourId, kpId).subscribe({
      next: () => {
        // Remove from array — indices (numbering) update automatically via *ngFor index
        this.keyPoints = this.keyPoints.filter(kp => kp.id !== kpId);
        this.deletingId = null;
        this.cdr.detectChanges();
        this.renderKpMarkers();
      },
      error: () => {
        this.deletingId = null;
        this.cdr.detectChanges();
      }
    });
  }

  private resetForm(): void {
    this.name = '';
    this.description = '';
    this.imageBase64 = '';
    this.imageFileName = '';
    this.latitude = null;
    this.longitude = null;
    if (this.selectedMarker) {
      this.map.removeLayer(this.selectedMarker);
      this.selectedMarker = null;
    }
  }

  goBack(): void {
    this.router.navigate(['/tours/my']);
  }
}
