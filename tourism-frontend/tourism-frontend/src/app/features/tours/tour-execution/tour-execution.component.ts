import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import * as L from 'leaflet';
import {
  TourService, TourDto, KeyPointDto,
  TourExecutionDto, CompletedKeyPointDto, CheckPositionResponseDto
} from '../../../core/services/tour.service';
import { ProfileService } from '../../../core/services/profile.service';
import { AuthService } from '../../../core/services/auth.service';
import { catchError, of } from 'rxjs';

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
  selector: 'app-tour-execution',
  standalone: false,
  templateUrl: './tour-execution.component.html',
  styleUrl: './tour-execution.component.scss'
})
export class TourExecutionComponent implements OnInit, OnDestroy {

  execution: TourExecutionDto | null = null;
  tour: TourDto | null = null;
  keyPoints: KeyPointDto[] = [];
  completedKeyPointIds = new Set<number>();

  loading = true;
  error = '';
  ending = false;

  // Position update panel
  showPosPanel = false;
  posLat: number | null = null;
  posLng: number | null = null;
  savingPos = false;
  posSaved = false;
  posError = '';

  private map!: L.Map;
  private polyline: L.Polyline | null = null;
  private positionMarker: L.Marker | null = null;
  private kpMarkers: L.Marker[] = [];
  private pollInterval: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tourService: TourService,
    private profileService: ProfileService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const tourId = Number(this.route.snapshot.paramMap.get('id'));
    this.initExecution(tourId);
  }

  ngOnDestroy(): void {
    if (this.pollInterval) clearInterval(this.pollInterval);
    if (this.map) this.map.remove();
  }

  private initMap(): void {
    if (this.map) return;
    this.map = L.map('exec-map', { center: [44.8, 20.5], zoom: 7 });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    // Click on map to set your position (when panel is open)
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      if (!this.showPosPanel) return;
      this.posLat = parseFloat(e.latlng.lat.toFixed(6));
      this.posLng = parseFloat(e.latlng.lng.toFixed(6));
      this.posSaved = false;
      this.updatePosMarker(this.posLat, this.posLng);
      this.cdr.detectChanges();
    });

    this.renderMap();
  }

  private initExecution(tourId: number): void {
    const userId = this.authService.getUser()?.id;
    if (!userId) { this.error = 'Not authenticated.'; this.loading = false; return; }

    // First check if there's already an active execution
    this.tourService.getActiveExecution().pipe(
      catchError(() => of(null))
    ).subscribe(activeEx => {
      if (activeEx) {
        if (activeEx.tourId === tourId) {
          // Resume this execution
          this.loadExecution(activeEx, tourId);
        } else {
          this.error = 'You have another tour in progress. Complete or abandon it before starting a new one.';
          this.loading = false;
          this.cdr.detectChanges();
        }
        return;
      }
      // No active execution — start a new one
      this.profileService.getProfile(userId).subscribe({
        next: (profile) => {
          const lat = profile.currentLatitude ?? 44.8;
          const lng = profile.currentLongitude ?? 20.5;
          this.posLat = lat;
          this.posLng = lng;

          this.tourService.startTour(tourId, lat, lng).subscribe({
            next: (execution) => this.loadExecution(execution, tourId),
            error: (err) => {
              this.error = err?.error?.error ?? 'Failed to start tour.';
              this.loading = false;
              this.cdr.detectChanges();
            }
          });
        },
        error: () => {
          this.error = 'Could not get your position. Set it in the Position Simulator first.';
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
    });
  }

  private loadExecution(execution: TourExecutionDto, tourId: number): void {
    this.execution = execution;
    // Number() needed: gRPC proto3 serializes int64 as string, REST returns number
    this.completedKeyPointIds = new Set(
      (execution.completedKeyPoints ?? []).map((c: CompletedKeyPointDto) => Number(c.keyPointId))
    );

    this.tourService.getTour(tourId).subscribe(t => { this.tour = t; this.cdr.detectChanges(); });
    this.tourService.getKeyPoints(tourId).subscribe(kps => {
      this.keyPoints = kps;
      this.loading = false;
      this.cdr.detectChanges();
      // Map div is now in DOM — init map in next tick
      setTimeout(() => this.initMap(), 0);
    });

    if (execution.status === 'ACTIVE') {
      this.pollInterval = setInterval(() => this.checkPosition(), 10000);
    }
  }

  private checkPosition(overrideLat?: number, overrideLng?: number): void {
    if (!this.execution || this.execution.status !== 'ACTIVE') return;
    const userId = this.authService.getUser()?.id;
    if (!userId) return;

    if (overrideLat !== undefined && overrideLng !== undefined) {
      this.doCheckPosition(overrideLat, overrideLng);
      return;
    }

    this.profileService.getProfile(userId).subscribe({
      next: (profile) => {
        const lat = profile.currentLatitude ?? 44.8;
        const lng = profile.currentLongitude ?? 20.5;
        this.doCheckPosition(lat, lng);
      }
    });
  }

  private doCheckPosition(lat: number, lng: number): void {
    this.tourService.checkPosition(this.execution!.id, lat, lng).subscribe({
      next: (resp: CheckPositionResponseDto) => {
        (resp.allCompletedKeyPoints ?? []).forEach((c: CompletedKeyPointDto) =>
          this.completedKeyPointIds.add(Number(c.keyPointId))
        );
        this.updateMarkers();
        this.cdr.detectChanges();
        if (resp.tourCompleted && this.execution!.status === 'ACTIVE') {
          clearInterval(this.pollInterval);
          this.tourService.completeTour(this.execution!.id).subscribe({
            next: () => { this.execution!.status = 'COMPLETED'; this.cdr.detectChanges(); },
            error: () => { this.execution!.status = 'COMPLETED'; this.cdr.detectChanges(); }
          });
        }
      }
    });
  }

  // ── Position update panel ──────────────────────────────────────────────

  togglePosPanel(): void {
    this.showPosPanel = !this.showPosPanel;
    if (this.showPosPanel && this.posLat === null) {
      const userId = this.authService.getUser()?.id;
      if (userId) {
        this.profileService.getProfile(userId).subscribe(p => {
          this.posLat = p.currentLatitude ?? null;
          this.posLng = p.currentLongitude ?? null;
          if (this.posLat && this.posLng) this.updatePosMarker(this.posLat, this.posLng);
          this.cdr.detectChanges();
        });
      }
    }
    // Show cursor hint on map
    if (this.map) {
      this.map.getContainer().style.cursor = this.showPosPanel ? 'crosshair' : '';
    }
  }

  savePosition(): void {
    if (this.posLat === null || this.posLng === null) return;
    const userId = this.authService.getUser()?.id;
    if (!userId) return;
    this.savingPos = true;
    this.posSaved = false;
    this.posError = '';
    this.profileService.updatePosition(userId, this.posLat, this.posLng).subscribe({
      next: () => {
        this.savingPos = false;
        this.posSaved = true;
        this.cdr.detectChanges();
        // Pass coords directly — no need to re-fetch profile
        this.checkPosition(this.posLat!, this.posLng!);
      },
      error: (err) => {
        this.posError = err?.error ?? 'Failed to save position.';
        this.savingPos = false;
        this.cdr.detectChanges();
      }
    });
  }

  private updatePosMarker(lat: number, lng: number): void {
    if (!this.map) return;
    if (this.positionMarker) this.map.removeLayer(this.positionMarker);
    this.positionMarker = L.marker([lat, lng], {
      icon: L.divIcon({
        className: '',
        html: '<div class="exec-pos-marker"><span class="material-icons">person_pin_circle</span></div>',
        iconSize: [40, 40],
        iconAnchor: [20, 40]
      })
    }).addTo(this.map).bindPopup(`My position<br/>${lat.toFixed(5)}, ${lng.toFixed(5)}`);
  }

  // ── Tour actions ───────────────────────────────────────────────────────

  goToDetails(): void {
    if (this.execution) this.router.navigate(['/tours', Number(this.execution.tourId)]);
  }

  abandon(): void {
    if (!this.execution) return;
    if (!confirm('Are you sure you want to abandon this tour?')) return;
    clearInterval(this.pollInterval);
    this.ending = true;
    this.tourService.abandonTour(this.execution.id).subscribe({
      next: () => this.router.navigate(['/tours', this.execution!.tourId]),
      error: (err) => {
        this.error = err?.error?.error ?? 'Failed to abandon tour.';
        this.ending = false;
        this.cdr.detectChanges();
      }
    });
  }

  isKeyPointCompleted(kp: KeyPointDto): boolean {
    return this.completedKeyPointIds.has(kp.id);
  }

  get completedCount(): number { return this.completedKeyPointIds.size; }
  get totalKeyPoints(): number { return this.keyPoints.length; }

  goBack(): void { this.router.navigate(['/tours']); }

  private renderMap(): void {
    if (!this.map) return;

    if (this.polyline) { this.map.removeLayer(this.polyline); this.polyline = null; }

    if (this.keyPoints.length >= 2) {
      const coords = this.keyPoints.map(kp => `${kp.longitude},${kp.latitude}`).join(';');
      const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
      fetch(url)
        .then(r => r.json())
        .then(data => {
          if (!this.map) return;
          const routeCoords: [number, number][] = data?.routes?.[0]?.geometry?.coordinates;
          if (routeCoords?.length) {
            const latlngs = routeCoords.map(([lng, lat]) => [lat, lng] as L.LatLngTuple);
            this.polyline = L.polyline(latlngs, { color: '#a855f7', weight: 4 }).addTo(this.map);
          }
        })
        .catch(() => {
          if (!this.map) return;
          const latlngs = this.keyPoints.map(kp => [kp.latitude, kp.longitude] as L.LatLngTuple);
          this.polyline = L.polyline(latlngs, { color: '#a855f7', weight: 3, dashArray: '6,6' }).addTo(this.map);
        });
    }

    this.updateMarkers();

    if (this.keyPoints.length > 0) {
      const bounds = L.latLngBounds(this.keyPoints.map(kp => [kp.latitude, kp.longitude]));
      this.map.fitBounds(bounds, { padding: [40, 40] });
    }
  }

  private updateMarkers(): void {
    if (!this.map) return;
    this.kpMarkers.forEach(m => this.map.removeLayer(m));
    this.kpMarkers = [];

    this.keyPoints.forEach((kp, i) => {
      const completed = this.completedKeyPointIds.has(kp.id);
      const icon = L.divIcon({
        className: '',
        html: `<div class="exec-kp-marker ${completed ? 'completed' : ''}">${i + 1}</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });
      const marker = L.marker([kp.latitude, kp.longitude], { icon })
        .addTo(this.map)
        .bindPopup(`<strong>${kp.name}</strong><br/>${completed ? '✓ Completed' : 'Not yet reached'}`);
      this.kpMarkers.push(marker);
    });

    if (this.posLat && this.posLng) this.updatePosMarker(this.posLat, this.posLng);
  }
}
