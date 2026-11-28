import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { getLoggedInUser } from '../auth-session';
import { API_URL } from '../config';

interface StaffOrderItem {
  name: string;
  quantity: number;
  price: number | string;
}

interface StaffOrder {
  id: number;
  customer_id: number | null;
  total_amount: number | string;
  payment_method: string;
  payment_proof: string | null;
  order_type?: string;
  estimated_wait_minutes?: number | null;
  status: string;
  created_at?: string;
  items?: StaffOrderItem[];
}

@Component({
  selector: 'app-staff',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './staff.html',
  styleUrl: './staff.css'
})
export class Staff implements OnInit, OnDestroy {
    private readonly apiBase = API_URL;
  private refreshTimer: any = null;

  orders: StaffOrder[] = [];
  selectedOrder: StaffOrder | null = null;
  statusFilter = 'active';
  waitMinutes = 15;
  loading = false;
  message = '';
  errorMessage = '';

  readonly nextStatus: Record<string, string> = {
    received: 'preparing',
    preparing: 'ready',
    ready: 'completed'
  };

  readonly nextLabel: Record<string, string> = {
    received: 'Payment OK, start preparing',
    preparing: 'Mark as ready',
    ready: 'Mark as completed'
  };

  constructor(
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  get isAdmin(): boolean {
    return String(getLoggedInUser()?.role || '').toLowerCase() === 'admin';
  }

  ngOnInit(): void {
    const user = getLoggedInUser();
    const role = String(user?.role || '').toLowerCase();

    if (!user?.id) {
      this.router.navigate(['/login']);
      return;
    }
    if (role !== 'staff' && role !== 'admin') {
      this.router.navigate(['/']);
      return;
    }

    this.loadOrders();
    this.refreshTimer = setInterval(() => this.loadOrders(false), 10000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  toAmount(value: unknown): number {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  }

  typeLabel(type?: string): string {
    return String(type || 'dine-in').toLowerCase() === 'take-out' ? 'Take-out' : 'Dine-in';
  }

  get filteredOrders(): StaffOrder[] {
    return this.orders.filter((o) => {
      const status = String(o.status || '').toLowerCase();
      if (this.statusFilter === 'active') {
        return ['received', 'preparing', 'ready'].includes(status);
      }
      if (this.statusFilter === 'all') return true;
      return status === this.statusFilter;
    });
  }

  loadOrders(showSpinner = true): void {
    if (showSpinner) {
      this.loading = true;
    }

    this.http.get<StaffOrder[]>(`${this.apiBase}/api/admin/orders`).subscribe({
      next: (rows) => {
        this.orders = Array.isArray(rows) ? rows : [];

        const previousId = this.selectedOrder?.id;
        this.selectedOrder =
          this.orders.find((o) => o.id === previousId) || this.filteredOrders[0] || null;

        // Only reset the waiting time input when a different order is shown
        if (this.selectedOrder && this.selectedOrder.id !== previousId) {
          this.waitMinutes = this.selectedOrder.estimated_wait_minutes || 15;
        }

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.message || 'Failed to load orders.';
        this.cdr.detectChanges();
      }
    });
  }

  selectOrder(order: StaffOrder): void {
    this.selectedOrder = order;
    this.waitMinutes = order.estimated_wait_minutes || 15;
    this.cdr.detectChanges();
  }

  setStatus(order: StaffOrder, status: string, waitMinutes?: number): void {
    this.message = '';
    this.errorMessage = '';

    const body: Record<string, unknown> = { status };
    if (waitMinutes !== undefined) {
      body['estimatedWaitMinutes'] = Number(waitMinutes);
    }

    this.http.patch(`${this.apiBase}/api/orders/${order.id}/status`, body).subscribe({
      next: () => {
        this.message = `Order #${order.id} is now "${status}".`;
        this.loadOrders(false);
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to update the order.';
        this.cdr.detectChanges();
      }
    });
  }

  advance(order: StaffOrder): void {
    const next = this.nextStatus[String(order.status || '').toLowerCase()];
    if (!next) return;

    // The waiting time is saved when the order starts preparing
    this.setStatus(order, next, next === 'preparing' ? this.waitMinutes : undefined);
  }

  updateWaitTime(order: StaffOrder): void {
    this.setStatus(order, 'preparing', this.waitMinutes);
  }
}