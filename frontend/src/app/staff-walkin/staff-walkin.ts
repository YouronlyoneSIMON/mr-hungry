import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { getLoggedInUser } from '../auth-session';
import { API_URL } from '../config';

interface MenuRow {
  id: number;
  name: string;
  price: number | string;
  category_name?: string;
  is_available: number | boolean;
}

interface OrderLine {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

@Component({
  selector: 'app-staff-walkin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './staff-walkin.html',
  styleUrl: './staff-walkin.css'
})
export class StaffWalkin implements OnInit {
    private readonly apiBase = API_URL;
  menuItems: MenuRow[] = [];
  selectedCategory = 'All';
  lines: OrderLine[] = [];

  customerName = '';
  paymentMethod: 'counter' | 'gcash' = 'counter';
  paymentProof = '';

  isSubmitting = false;
  message = '';
  errorMessage = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

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

    this.loadMenu();
  }

  loadMenu(): void {
    this.http.get<MenuRow[]>(`${this.apiBase}/api/menu-items`).subscribe({
      next: (rows) => {
        this.menuItems = Array.isArray(rows) ? rows : [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Failed to load the menu.';
        this.cdr.detectChanges();
      }
    });
  }

  toAmount(value: unknown): number {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  }

  isAvailable(item: MenuRow): boolean {
    return Number(item.is_available) === 1;
  }

  get categories(): string[] {
    const names = new Set(this.menuItems.map((i) => i.category_name || 'Uncategorized'));
    return ['All', ...Array.from(names)];
  }

  get filteredItems(): MenuRow[] {
    if (this.selectedCategory === 'All') return this.menuItems;
    return this.menuItems.filter(
      (i) => (i.category_name || 'Uncategorized') === this.selectedCategory
    );
  }

  get totalAmount(): number {
    return this.lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
  }

  addItem(item: MenuRow): void {
    if (!this.isAvailable(item)) return;
    const existing = this.lines.find((l) => l.id === item.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      this.lines.push({
        id: item.id,
        name: item.name,
        price: this.toAmount(item.price),
        quantity: 1
      });
    }
  }

  changeQty(index: number, delta: number): void {
    const line = this.lines[index];
    if (!line) return;
    line.quantity += delta;
    if (line.quantity <= 0) {
      this.lines.splice(index, 1);
    }
  }

  removeLine(index: number): void {
    this.lines.splice(index, 1);
  }

  placeOrder(): void {
    this.message = '';
    this.errorMessage = '';

    if (this.lines.length === 0) {
      this.errorMessage = 'Add at least one item first.';
      return;
    }

    const ref = this.paymentProof.trim();
    if (this.paymentMethod === 'gcash' && !ref) {
      this.errorMessage = 'Enter the GCash reference number from the customer receipt.';
      return;
    }

    this.isSubmitting = true;

    this.http
      .post<any>(`${this.apiBase}/api/staff/orders`, {
        customerName: this.customerName.trim(),
        paymentMethod: this.paymentMethod,
        paymentProof: this.paymentMethod === 'gcash' ? ref : null,
        items: this.lines.map((l) => ({ id: l.id, quantity: l.quantity }))
      })
      .subscribe({
        next: (res) => {
          const order = res?.order;
          this.message =
            `Order #${order?.id} placed for ${order?.customerName} — ` +
            `₱${this.toAmount(order?.totalAmount).toFixed(2)}`;
          this.lines = [];
          this.customerName = '';
          this.paymentProof = '';
          this.paymentMethod = 'counter';
          this.isSubmitting = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.errorMessage = err?.error?.message || 'Failed to place the order.';
          this.isSubmitting = false;
          this.cdr.detectChanges();
        }
      });
  }
}