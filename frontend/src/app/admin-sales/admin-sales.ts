import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { getLoggedInUser } from '../auth-session';
import { API_URL } from '../config';


interface DayRow {
  day: string;
  orders: number;
  revenue: number;
}

interface TopItem {
  name: string;
  sold: number;
}

interface SalesSummary {
  totalRevenue: number;
  completedOrders: number;
  averageOrder: number;
  todayRevenue: number;
  todayOrders: number;
  byDay: DayRow[];
  topItems: TopItem[];
}

@Component({
  selector: 'app-admin-sales',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-sales.html',
  styleUrl: './admin-sales.css'
})
export class AdminSales implements OnInit {
    private readonly apiBase = API_URL;

  summary: SalesSummary | null = null;
  loading = false;
  errorMessage = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const user = getLoggedInUser();

    if (!user?.id) {
      this.router.navigate(['/login']);
      return;
    }
    if (String(user.role || '').toLowerCase() !== 'admin') {
      this.router.navigate(['/']);
      return;
    }

    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';

    this.http.get<SalesSummary>(`${this.apiBase}/api/admin/sales`).subscribe({
      next: (data) => {
        this.summary = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to load the sales summary.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  get maxRevenue(): number {
    const values = (this.summary?.byDay || []).map((d) => d.revenue);
    return Math.max(1, ...values);
  }

  barHeight(revenue: number): number {
    return Math.max(4, (revenue / this.maxRevenue) * 100);
  }

  dayLabel(day: string): string {
    return day.slice(5);
  }
}