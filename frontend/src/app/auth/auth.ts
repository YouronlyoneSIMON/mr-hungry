import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, timeout } from 'rxjs';
import { MrHungryApiService } from '../services/mr-hungry-api.service';
import { CartStateService } from '../services/cart-state.service';
import { clearLoggedInUser, getLoggedInUser, setSession } from '../auth-session';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './auth.html',
  styleUrl: './auth.css'
})
export class Auth {
  mode: 'login' | 'signup' = 'login';
  currentUser: any = null;

  fullName = '';
  email = '';
  password = '';
  confirmPassword = '';

  showPassword = false;
  showConfirm = false;

  isSubmitting = false;
  message = '';
  infoMessage = '';
  errorMessage = '';

  constructor(
    private api: MrHungryApiService,
    private cart: CartStateService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {
    this.currentUser = getLoggedInUser();

    const currentUrl = this.router.url || '';
    const routePath = this.route.snapshot.routeConfig?.path || '';
    this.mode = routePath === 'signup' || currentUrl.includes('/signup') ? 'signup' : 'login';

    if (this.route.snapshot.queryParamMap.get('registered') === '1') {
      this.message = 'Account created! Please log in.';
    }
  }

  get isSignup(): boolean {
    return this.mode === 'signup';
  }

  private homeFor(role: unknown): string {
    const value = String(role || '').toLowerCase();
    if (value === 'admin') return '/admin';
    if (value === 'staff') return '/staff';
    return '/menu';
  }

  continueSession(): void {
    this.router.navigate([this.homeFor(this.currentUser?.role)]);
  }

  logout(): void {
    clearLoggedInUser();
    this.cart.clearCart();
    this.currentUser = null;
    this.message = '';
    this.errorMessage = '';
    this.cdr.detectChanges();
  }

  continueAsGuest(): void {
    this.router.navigate(['/menu']);
  }

  // Placeholder until the password reset page is built
  forgotPassword(): void {
    this.errorMessage = '';
    this.message = '';
    this.infoMessage =
      'Password reset is coming soon. For now, please ask the restaurant admin for help.';
    this.cdr.detectChanges();
  }

  onSubmit(): void {
    this.message = '';
    this.infoMessage = '';
    this.errorMessage = '';

    const cleanFullName = this.fullName.trim();
    const cleanEmail = this.email.trim();

    if (!cleanEmail || !this.password || (this.isSignup && !cleanFullName)) {
      this.errorMessage = this.isSignup
        ? 'Please enter your full name, email, and password.'
        : 'Please enter your email and password.';
      this.cdr.detectChanges();
      return;
    }

    if (!EMAIL_PATTERN.test(cleanEmail)) {
      this.errorMessage = 'Please enter a valid email address.';
      this.cdr.detectChanges();
      return;
    }

    if (this.isSignup) {
      if (this.password.length < 8) {
        this.errorMessage = 'Password must be at least 8 characters.';
        this.cdr.detectChanges();
        return;
      }
      if (this.password !== this.confirmPassword) {
        this.errorMessage = 'Passwords do not match.';
        this.cdr.detectChanges();
        return;
      }
    }

    this.isSubmitting = true;
    this.cdr.detectChanges();

    const request$ = this.isSignup
      ? this.api.signup({ fullName: cleanFullName, email: cleanEmail, password: this.password })
      : this.api.login({ email: cleanEmail, password: this.password });

    request$
      .pipe(
        timeout(10000),
        finalize(() => {
          this.isSubmitting = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (res: any) => {
          if (this.isSignup) {
            // After sign up, return to the login page
            this.router.navigate(['/login'], { queryParams: { registered: '1' } });
            return;
          }

          const userData = res?.user ?? res;
          if (userData && typeof userData === 'object') {
            setSession(userData, res?.token ?? null);
            this.currentUser = userData;
          }

          this.router.navigate([this.homeFor(userData?.role)]);
        },
        error: (err: any) => {
          this.errorMessage =
            err?.name === 'TimeoutError'
              ? 'Request timed out. Check if backend server (port 5000) is running.'
              : err?.error?.message ||
                (this.isSignup ? 'Sign up failed.' : 'Invalid email or password.');
          this.cdr.detectChanges();
        }
      });
  }
}