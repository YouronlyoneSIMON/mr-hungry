import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { clearLoggedInUser, getLoggedInUser, setSession } from '../auth-session';
import { CartStateService } from '../services/cart-state.service';
import { API_URL } from '../config';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './account.html',
  styleUrl: './account.css'
})
export class Account implements OnInit {
    private readonly apiBase = API_URL;
  name = '';
  email = '';
  role = '';

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  deletePassword = '';

  message = '';
  errorMessage = '';
  deleteError = '';
  isSaving = false;
  isDeleting = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private cart: CartStateService,
    private cdr: ChangeDetectorRef
  ) {}

  get canDelete(): boolean {
    return this.role === 'customer';
  }

  get initial(): string {
    return (this.name || this.email || 'U').charAt(0).toUpperCase();
  }

  ngOnInit(): void {
    const user = getLoggedInUser();
    if (!user?.id) {
      this.router.navigate(['/login']);
      return;
    }
    this.name = String(user.name || user.fullName || '');
    this.email = String(user.email || '');
    this.role = String(user.role || '').toLowerCase();
  }

  logout(): void {
    clearLoggedInUser();
    this.cart.clearCart();
    this.router.navigate(['/login']);
  }

  saveProfile(): void {
    this.message = '';
    this.errorMessage = '';

    if (!this.name.trim()) {
      this.errorMessage = 'Please enter your name.';
      return;
    }

    if (this.newPassword) {
      if (this.newPassword.length < 8) {
        this.errorMessage = 'New password must be at least 8 characters.';
        return;
      }
      if (this.newPassword !== this.confirmPassword) {
        this.errorMessage = 'New password and confirmation do not match.';
        return;
      }
      if (!this.currentPassword) {
        this.errorMessage = 'Enter your current password to set a new one.';
        return;
      }
    }

    this.isSaving = true;

    this.http
      .patch<any>(`${this.apiBase}/api/account`, {
        name: this.name.trim(),
        currentPassword: this.currentPassword,
        newPassword: this.newPassword
      })
      .subscribe({
        next: (res) => {
          if (res?.user) {
            setSession(res.user, null);
            this.name = res.user.name;
          }
          this.message = 'Your account was updated.';
          this.currentPassword = '';
          this.newPassword = '';
          this.confirmPassword = '';
          this.isSaving = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.errorMessage = err?.error?.message || 'Failed to update your account.';
          this.isSaving = false;
          this.cdr.detectChanges();
        }
      });
  }

  deleteAccount(): void {
    this.deleteError = '';

    if (!this.deletePassword) {
      this.deleteError = 'Enter your password to confirm.';
      return;
    }
    if (!confirm('Delete your account? This cannot be undone.')) {
      return;
    }

    this.isDeleting = true;

    this.http
      .delete(`${this.apiBase}/api/account`, { body: { password: this.deletePassword } })
      .subscribe({
        next: () => {
          clearLoggedInUser();
          this.cart.clearCart();
          this.router.navigate(['/login']);
        },
        error: (err) => {
          this.deleteError = err?.error?.message || 'Failed to delete the account.';
          this.isDeleting = false;
          this.cdr.detectChanges();
        }
      });
  }
}