import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subject, finalize, interval, takeUntil, timeout } from 'rxjs';
import { MrHungryApiService } from '../services/mr-hungry-api.service';
import { getLoggedInUser } from '../auth-session';

export interface OrderHistoryLineItem {
  name: string;
  quantity: number;
  price: number;
}

export interface CustomerOrderRecord {
  id: number | string;
  orderDate: string;
  status: string;
  paymentMethod: string;
  orderType: string;
  estimatedWait: number | null;
  totalAmount: number;
  items: OrderHistoryLineItem[];
}

@Component({
  selector: 'app-order-history',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './order-history.html',
  styleUrl: './order-history.css'
})
export class OrderHistory implements OnInit, OnDestroy {
  readonly trackSteps = ['Received', 'Preparing', 'Ready', 'Completed'];

  orders: CustomerOrderRecord[] = [];
  selectedOrder: CustomerOrderRecord | null = null;
  completedNotice: CustomerOrderRecord | null = null;

  isLoading = false;
  errorMessage = '';
  lastUpdatedAt: Date | null = null;

  private readonly destroy$ = new Subject<void>();
  private isRefreshing = false;
  private lastStatuses = new Map<string, string>();

  constructor(
    private api: MrHungryApiService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  get isLoggedIn(): boolean {
    return Boolean(getLoggedInUser()?.id);
  }

  ngOnInit(): void {
    this.loadOrderHistory(true);

    interval(5000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.isLoggedIn && !this.isRefreshing) {
          this.loadOrderHistory(false);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  refreshOrders(): void {
    this.loadOrderHistory(true);
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  selectOrder(order: CustomerOrderRecord): void {
    this.selectedOrder = order;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.cdr.detectChanges();
  }

  dismissNotice(): void {
    this.completedNotice = null;
  }

  viewReceipt(order: CustomerOrderRecord): void {
    this.completedNotice = null;
    this.selectOrder(order);
  }

  statusKey(order: CustomerOrderRecord): string {
    return order.status.toLowerCase();
  }

  isCompleted(order: CustomerOrderRecord): boolean {
    return this.statusKey(order) === 'completed';
  }

  typeLabel(type: string): string {
    return String(type || '').toLowerCase() === 'take-out' ? 'Take-out' : 'Dine-in';
  }

  stepIndex(order: CustomerOrderRecord): number {
    return this.trackSteps.findIndex((s) => s.toLowerCase() === this.statusKey(order));
  }

  headline(order: CustomerOrderRecord): string {
    switch (this.statusKey(order)) {
      case 'received':
        return "We've received your order";
      case 'preparing':
        return "We're preparing your order";
      case 'ready':
        return 'Your order is ready!';
      case 'completed':
        return 'Order completed';
      case 'cancelled':
        return 'Order cancelled';
      default:
        return 'Order status';
    }
  }

  paymentNote(order: CustomerOrderRecord): string {
    const status = this.statusKey(order);
    const method = order.paymentMethod.toLowerCase();

    if (status === 'cancelled') return 'This order was cancelled.';
    if (status === 'completed') return 'Payment received. Thank you!';
    if (method === 'gcash') {
      return status === 'received' ? 'Payment pending verification by staff.' : 'Payment verified.';
    }
    return 'Please pay at the counter.';
  }

  private formatStatus(rawStatus: unknown): string {
    const cleaned = String(rawStatus ?? 'Pending').trim();
    if (!cleaned) return 'Pending';
    return cleaned.replace(/[_-]+/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
  }

  private normalizeOrders(rawList: any[]): CustomerOrderRecord[] {
    if (!Array.isArray(rawList)) return [];

    return rawList.map((raw, idx) => {
      const rawItems: any[] = Array.isArray(raw?.items) ? raw.items : [];

      const items: OrderHistoryLineItem[] = rawItems.map((it: any) => ({
        name: String(it?.name ?? 'Menu Item'),
        quantity: Math.max(1, Number(it?.quantity ?? 1)),
        price: Number(it?.price ?? 0)
      }));

      const computedTotal = items.reduce((sum, it) => sum + it.price * it.quantity, 0);
      const wait = Number(raw?.estimated_wait_minutes);

      return {
        id: raw?.id ?? idx + 1,
        orderDate: String(raw?.created_at ?? ''),
        status: this.formatStatus(raw?.status),
        paymentMethod: String(raw?.payment_method ?? 'counter'),
        orderType: String(raw?.order_type ?? 'dine-in'),
        estimatedWait: Number.isFinite(wait) && wait > 0 ? wait : null,
        totalAmount: Number(raw?.total_amount ?? computedTotal),
        items
      };
    });
  }

  loadOrderHistory(showSpinner = true): void {
    const user = getLoggedInUser();

    if (!user?.id) {
      this.errorMessage = '';
      this.orders = [];
      this.selectedOrder = null;
      this.cdr.detectChanges();
      return;
    }

    if (this.isRefreshing) return;
    this.isRefreshing = true;

    if (showSpinner) {
      this.errorMessage = '';
      this.isLoading = true;
      this.cdr.detectChanges();
    }

    const previousSelectedId = this.selectedOrder?.id ?? null;

    this.api
      .getOrdersByCustomer(Number(user.id))
      .pipe(
        timeout(10000),
        takeUntil(this.destroy$),
        finalize(() => {
          this.isRefreshing = false;
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (res: any) => {
          const list = Array.isArray(res) ? res : [];
          this.errorMessage = '';
          this.orders = this.normalizeOrders(list);
          this.lastUpdatedAt = new Date();

          // Notify when an order just became completed
          for (const order of this.orders) {
            const key = String(order.id);
            const before = this.lastStatuses.get(key);
            if (before && before.toLowerCase() !== 'completed' && this.isCompleted(order)) {
              this.completedNotice = order;
            }
            this.lastStatuses.set(key, order.status);
          }

          if (previousSelectedId !== null) {
            this.selectedOrder =
              this.orders.find((o) => String(o.id) === String(previousSelectedId)) ??
              this.orders[0] ??
              null;
          } else {
            this.selectedOrder = this.orders[0] ?? null;
          }

          this.cdr.detectChanges();
        },
        error: () => {
          this.errorMessage = 'Could not load your orders. Please check your connection and try again.';
          this.cdr.detectChanges();
        }
      });
  }
}