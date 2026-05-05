import { AfterViewInit, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import * as L from 'leaflet';
import { ProfileService } from '../../core/services/profile.service';
import { AuthService } from '../../core/services/auth.service';

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
  selector: 'app-position-simulator',
  standalone: false,
  templateUrl: './position-simulator.component.html',
  styleUrl: './position-simulator.component.scss'
})
export class PositionSimulatorComponent implements OnInit, AfterViewInit, OnDestroy {

  latitude: number | null = null;
  longitude: number | null = null;
  saving = false;
  saved = false;
  error = '';
  loading = true;

  private map!: L.Map;
  private positionMarker: L.Marker | null = null;

  constructor(
    private profileService: ProfileService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const userId = this.authService.getUser()?.id;
    if (!userId) { this.loading = false; return; }

    this.profileService.getProfile(userId).subscribe({
      next: (profile) => {
        if (profile.currentLatitude != null && profile.currentLongitude != null) {
          this.latitude  = profile.currentLatitude;
          this.longitude = profile.currentLongitude;
          this.placeMarker(this.latitude, this.longitude, false);
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
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

  private initMap(): void {
    this.map = L.map('sim-map', { center: [44.8, 20.5], zoom: 7 });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      const lat = parseFloat(e.latlng.lat.toFixed(6));
      const lng = parseFloat(e.latlng.lng.toFixed(6));
      this.latitude  = lat;
      this.longitude = lng;
      this.saved = false;
      this.placeMarker(lat, lng, true);
      this.cdr.detectChanges();
    });

    if (this.latitude !== null && this.longitude !== null) {
      this.placeMarker(this.latitude, this.longitude, false);
    }
  }

  private placeMarker(lat: number, lng: number, openPopup: boolean): void {
    if (!this.map) return;
    if (this.positionMarker) this.map.removeLayer(this.positionMarker);

    this.positionMarker = L.marker([lat, lng], {
      icon: L.divIcon({
        className: '',
        html: '<div class="sim-position-marker"><span class="material-icons">person_pin_circle</span></div>',
        iconSize: [40, 40],
        iconAnchor: [20, 40]
      })
    }).addTo(this.map).bindPopup(`My position<br/>${lat}, ${lng}`);

    if (openPopup) this.positionMarker.openPopup();
    this.map.setView([lat, lng], Math.max(this.map.getZoom(), 12));
  }

  savePosition(): void {
    const userId = this.authService.getUser()?.id;
    if (!userId || this.latitude === null || this.longitude === null) return;

    this.saving = true;
    this.error  = '';
    this.saved  = false;

    this.profileService.updatePosition(userId, this.latitude, this.longitude).subscribe({
      next: () => {
        this.saving = false;
        this.saved  = true;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error  = err?.error ?? 'Failed to save position.';
        this.saving = false;
        this.cdr.detectChanges();
      }
    });
  }
}
