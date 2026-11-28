import { AfterViewInit, ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';

export interface RestoLocation {
  id: string;
  name: string;
  address: string;
  hours: string;
  status: 'Open' | 'Closed';
  lat: number;
  lng: number;
}

export interface UserCoords {
  lat: number;
  lng: number;
  accuracy: number;
}

@Component({
  selector: 'app-locations-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './locations-map.html',
  styleUrl: './locations-map.css'
})
export class LocationsMap implements AfterViewInit, OnDestroy {
  resto: RestoLocation = {
    id: 'mr-hungry-kitchen-calauan',
    name: 'Mr Hungry Kitchen',
    address: '2nd Floor, Alvela Street, Brgy. Kanluran, Calauan, Laguna 4012',
    hours: 'Daily, 11:00 AM – 11:00 PM',
    status: 'Open',
    lat: 14.1456,
    lng: 121.3135
  };

  userLocation: UserCoords | null = null;
  locationStatus = 'Starting live GPS tracking...';
  locationError = '';
  distanceKm: number | null = null;

  private map: L.Map | null = null;
  private userMarker: L.Marker | null = null;
  private accuracyCircle: L.Circle | null = null;
  private watchId: number | null = null;
  private shouldFitBoth = true;

  constructor(private cdr: ChangeDetectorRef) {}

  ngAfterViewInit(): void {
    this.initMap();
    this.startLiveTracking();
  }

  ngOnDestroy(): void {
    this.stopLiveTracking();
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  locateUser(): void {
    this.shouldFitBoth = true;
    this.startLiveTracking();
  }

  private pinIcon(color: string): L.DivIcon {
    return L.divIcon({
      className: '',
      html:
        '<div style="width:30px;height:30px;border-radius:50% 50% 50% 0;' +
        `background:${color};transform:rotate(-45deg);border:3px solid #ffffff;` +
        'box-shadow:0 2px 8px rgba(0,0,0,0.4);"></div>',
      iconSize: [30, 30],
      iconAnchor: [15, 30],
      popupAnchor: [0, -28]
    });
  }

  private initMap(): void {
    this.map = L.map('resto-map').setView([this.resto.lat, this.resto.lng], 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    L.marker([this.resto.lat, this.resto.lng], { icon: this.pinIcon('#ea580c') })
      .addTo(this.map)
      .bindPopup(`<strong>${this.resto.name}</strong><br>${this.resto.address}`);

    // The map sits inside a layout that finishes sizing after the first paint
    setTimeout(() => this.map?.invalidateSize(), 200);
  }

  startLiveTracking(): void {
    this.locationError = '';

    if (!('geolocation' in navigator)) {
      this.locationStatus = 'Geolocation is not supported by this browser.';
      this.cdr.detectChanges();
      return;
    }

    this.stopLiveTracking();
    this.locationStatus = 'Tracking live location...';
    this.cdr.detectChanges();

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        this.userLocation = {
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
          accuracy: Math.round(pos.coords.accuracy)
        };

        this.distanceKm = this.calculateDistanceKm(
          this.userLocation.lat,
          this.userLocation.lng,
          this.resto.lat,
          this.resto.lng
        );

        this.locationStatus = 'Live location active';
        this.updateUserOnMap();
        this.cdr.detectChanges();
      },
      (err) => {
        this.locationStatus = 'Unable to track current location';
        this.locationError =
          err.code === err.PERMISSION_DENIED
            ? 'Location permission was denied. Allow location access in your browser and click Refresh Location.'
            : 'Could not retrieve live GPS coordinates right now.';
        this.cdr.detectChanges();
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 1000 }
    );
  }

  private updateUserOnMap(): void {
    if (!this.map || !this.userLocation) return;

    const point = L.latLng(this.userLocation.lat, this.userLocation.lng);

    if (!this.userMarker) {
      this.userMarker = L.marker(point, { icon: this.pinIcon('#111827') })
        .addTo(this.map)
        .bindPopup('<strong>You are here</strong>');
    } else {
      this.userMarker.setLatLng(point);
    }

    if (!this.accuracyCircle) {
      this.accuracyCircle = L.circle(point, {
        radius: this.userLocation.accuracy,
        color: '#111827',
        weight: 1,
        fillOpacity: 0.08
      }).addTo(this.map);
    } else {
      this.accuracyCircle.setLatLng(point);
      this.accuracyCircle.setRadius(this.userLocation.accuracy);
    }

    // Show both pins once, then let the customer move the map freely
    if (this.shouldFitBoth) {
      const bounds = L.latLngBounds(
        [this.resto.lat, this.resto.lng],
        [this.userLocation.lat, this.userLocation.lng]
      );
      this.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 17 });
      this.shouldFitBoth = false;
    }
  }

  private stopLiveTracking(): void {
    if (this.watchId !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  private calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((R * c).toFixed(2));
  }
}