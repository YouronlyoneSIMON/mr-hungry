import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { setLoggedInUser } from '../auth-session';
import { API_URL } from '../config';

interface LoginResponse {
  message?: string;
  user?: {
    id: number;
    fullName?: string;
    name?: string;
    email?: string;
    role?: string;
    status?: string;
  };
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
      private readonly apiBase = API_URL;

  email = '';
  password = '';
  loading = false;
  errorMessage = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  onSubmit(): void {
    this.errorMessage = '';
    const trimmedEmail = this.email.trim().toLowerCase();

    if (!trimmedEmail || !this.password) {
      this.errorMessage = 'Please enter your email and password.';
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();

    this.http
      .post<LoginResponse>(`${this.apiBase}/api/auth/login`, {
        email: trimmedEmail,
        password: this.password
      })
      .subscribe({
        next: (res) => {
          this.loading = false;

          if (res?.user) {
            setLoggedInUser(res.user);
          }

          const role = String(res?.user?.role || '').trim().toLowerCase();
          if (role === 'admin') {
            this.router.navigate(['/admin']);
          } else {
            this.router.navigate(['/menu']);
          }

          this.cdr.detectChanges();
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = err?.error?.message || 'Invalid email or password.';
          this.cdr.detectChanges();
        }
      });
  }
}