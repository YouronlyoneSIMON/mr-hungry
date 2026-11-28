import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { clearLoggedInUser, getLoggedInUser, isLoggedInAdmin } from './auth-session';
import { CartStateService } from './services/cart-state.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  profileMenuOpen = false;

  constructor(
    public cartState: CartStateService,
    private router: Router
  ) {}

  get currentUser() {
    return getLoggedInUser();
  }

  get isLoggedIn(): boolean {
    return Boolean(this.currentUser?.id);
  }

  get isAdmin(): boolean {
    return isLoggedInAdmin();
  }

  get isStaff(): boolean {
    return String(this.currentUser?.role || '').trim().toLowerCase() === 'staff';
  }

  toggleProfileMenu(): void {
    this.profileMenuOpen = !this.profileMenuOpen;
  }

  closeProfileMenu(): void {
    this.profileMenuOpen = false;
  }

  logout(): void {
    clearLoggedInUser();
    this.cartState.clearCart();
    this.profileMenuOpen = false;
    this.router.navigate(['/login']);
  }
}