import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { getLoggedInUser } from '../auth-session';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home {
  get user() {
    return getLoggedInUser();
  }

  get role(): string {
    return String(this.user?.role || '').toLowerCase();
  }

  get isGuest(): boolean {
    return !this.user?.id;
  }

  get firstName(): string {
    return String(this.user?.name || '').split(' ')[0];
  }
}