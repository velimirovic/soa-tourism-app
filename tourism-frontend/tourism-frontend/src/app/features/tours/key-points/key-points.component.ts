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

  // Add-form fields
  name = '';
  description = '';
  imageBase64 = '';
  imageFileName = '';
  latitude: number | null = null;
  longitude: number | null = null;
  formError = '';
  submitting = false;

  // Edit state
  editingKp: KeyPointDto | null = null;
  editName = '';
  editDescription = '';
  editImageBase64 = '';
  editImageFileName = '';
  editLatitude: number | null = null;
  editLongitude: number | null = null;
  editError = '';
  editSaving = false;

  // Delete state
  deletingId: number | null = null;

  private map!: L.Map;
  private selectedMarker: L.Marker | null = null;
  private kpMarkers: L.Marker[] = [];
  private polyline: L.Polyline | null = null;

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
    this.map = L.map('kp-map', { center: [44.8, 20.5], zoom: 7 });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      const lat = parseFloat(e.latlng.lat.toFixed(6));
      const lng = parseFloat(e.latlng.lng.toFixed(6));

      if (this.editingKp) {
        // In edit mode, click updates the edit coords
        this.editLatitude  = lat;
        this.editLongitude = lng;
        if (this.selectedMarker) this.map.removeLayer(this.selectedMarker);
        this.selectedMarker = L.marker([lat, lng])
          .addTo(this.map).bindPopup('New position').openPopup();
      } else {
        // Add mode
        this.latitude  = lat;
        this.longitude = lng;
        if (this.selectedMarker) this.map.removeLayer(this.selectedMarker);
        this.selectedMarker = L.marker([lat, lng])
          .addTo(this.map).bindPopup('Selected location').openPopup();
      }
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
    if (this.polyline) { this.map.removeLayer(this.polyline); this.polyline = null; }

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

  // ── Image upload ────────────────────────────────────────────────
  onImageSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.imageFileName = file.name;
    const reader = new FileReader();
    reader.onload = () => { this.imageBase64 = reader.result as string; this.cdr.detectChanges(); };
    reader.readAsDataURL(file);
  }

  clearImage(): void { this.imageBase64 = ''; this.imageFileName = ''; }

  onEditImageSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.editImageFileName = file.name;
    const reader = new FileReader();
    reader.onload = () => { this.editImageBase64 = reader.result as string; this.cdr.detectChanges(); };
    reader.readAsDataURL(file);
  }

  clearEditImage(): void { this.editImageBase64 = ''; this.editImageFileName = ''; }

  // ── Add key point ───────────────────────────────────────────────
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

  // ── Edit key point ──────────────────────────────────────────────
  openEdit(kp: KeyPointDto): void {
    this.editingKp      = kp;
    this.editName       = kp.name;
    this.editDescription= kp.description ?? '';
    this.editImageBase64= kp.imageUrl ?? '';
    this.editImageFileName = '';
    this.editLatitude   = kp.latitude;
    this.editLongitude  = kp.longitude;
    this.editError      = '';

    if (this.selectedMarker) { this.map.removeLayer(this.selectedMarker); this.selectedMarker = null; }
    this.selectedMarker = L.marker([kp.latitude, kp.longitude])
      .addTo(this.map).bindPopup('Current position (click map to change)').openPopup();

    this.cdr.detectChanges();
  }

  cancelEdit(): void {
    this.editingKp = null;
    if (this.selectedMarker) { this.map.removeLayer(this.selectedMarker); this.selectedMarker = null; }
    this.cdr.detectChanges();
  }

  saveEdit(): void {
    if (!this.editingKp) return;
    if (!this.editName.trim()) { this.editError = 'Name is required.'; return; }
    if (this.editLatitude === null || this.editLongitude === null) {
      this.editError = 'Location is required.'; return;
    }

    this.editSaving = true;
    this.editError = '';

    const req: CreateKeyPointRequest = {
      name:        this.editName.trim(),
      description: this.editDescription.trim(),
      imageUrl:    this.editImageBase64,
      latitude:    this.editLatitude,
      longitude:   this.editLongitude
    };

    this.tourService.updateKeyPoint(this.tourId, this.editingKp.id, req).subscribe({
      next: (updated) => {
        this.keyPoints = this.keyPoints.map(k => k.id === updated.id ? updated : k);
        this.editSaving = false;
        this.editingKp = null;
        if (this.selectedMarker) { this.map.removeLayer(this.selectedMarker); this.selectedMarker = null; }
        this.cdr.detectChanges();
        this.renderKpMarkers();
      },
      error: () => {
        this.editError = 'Failed to update key point.';
        this.editSaving = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ── Delete key point ────────────────────────────────────────────
  deleteKeyPoint(kpId: number): void {
    if (this.deletingId !== null) return;
    this.deletingId = kpId;

    this.tourService.deleteKeyPoint(this.tourId, kpId).subscribe({
      next: () => {
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
    if (this.selectedMarker) { this.map.removeLayer(this.selectedMarker); this.selectedMarker = null; }
  }

  goBack(): void { this.router.navigate(['/tours/my']); }
}
