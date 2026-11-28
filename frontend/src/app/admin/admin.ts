import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { getLoggedInUser } from '../auth-session';
import { API_URL } from '../config';

type AdminTab = 'overview' | 'orders' | 'menu' | 'users' | 'logs';

interface OrderItemRow {
  id?: number;
  name?: string;
  quantity: number;
  price: number | string;
}

interface AdminOrderRow {
  id: number;
  customer_id: number | null;
  customer_name?: string | null;
  order_type?: string;
  estimated_wait_minutes?: number | null;
  total_amount: number | string;
  payment_method: string;
  payment_proof: string | null;
  status: string;
  created_at?: string;
  items?: OrderItemRow[];
}

interface AdminUserRow {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  created_at?: string;
}

interface CategoryRow {
  id: number;
  name: string;
}

interface MenuItemRow {
  id: number;
  category_id: number;
  category_name?: string;
  name: string;
  description: string | null;
  price: number | string;
  image_url: string | null;
  is_available: number | boolean;
}

interface LoginLogRow {
  id: number;
  email: string;
  role: string | null;
  status: string;
  message: string | null;
  created_at: string;
}

interface OrderLogRow {
  id: number;
  order_id: number;
  action: string;
  details: string | null;
  created_at: string;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin.html',
  styleUrl: './admin.css'
})
export class Admin implements OnInit {
    private readonly apiBase = API_URL;

  readonly tabs: { key: AdminTab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'orders', label: 'Orders' },
    { key: 'menu', label: 'Menu' },
    { key: 'users', label: 'Users' },
    { key: 'logs', label: 'Logs' }
  ];

  readonly orderStatuses = ['received', 'preparing', 'ready', 'completed', 'cancelled'];
  readonly statusChips = ['active', 'received', 'preparing', 'ready', 'completed', 'cancelled', 'all'];

  activeTab: AdminTab = 'overview';

  statusFilter = 'active';
  paymentFilter = 'all';
  orderSearch = '';
  menuSearch = '';

  orders: AdminOrderRow[] = [];
  selectedOrder: AdminOrderRow | null = null;
  detailStatus = 'received';
  detailWait: number | null = null;

  users: AdminUserRow[] = [];
  categories: CategoryRow[] = [];
  menuItems: MenuItemRow[] = [];
  loginLogs: LoginLogRow[] = [];
  orderLogs: OrderLogRow[] = [];

  newCategoryName = '';
  staffForm = { name: '', email: '', password: '' };

  editingItemId: number | null = null;
  itemForm = {
    category_id: 1,
    name: '',
    description: '',
    price: 0,
    image_url: '',
    is_available: true
  };

  loading = false;
  message = '';
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

    this.loadAll();
  }

  toAmount(value: unknown): number {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  }

  isAvailable(val: number | boolean): boolean {
    return val === true || Number(val) === 1;
  }

  customerLabel(order: AdminOrderRow): string {
    return order.customer_name || (order.customer_id ? `Customer #${order.customer_id}` : 'Walk-in');
  }

  typeLabel(type?: string): string {
    return String(type || 'dine-in').toLowerCase() === 'take-out' ? 'Take-out' : 'Dine-in';
  }

  statusKey(order: AdminOrderRow): string {
    return String(order.status || '').toLowerCase();
  }

  get activeOrdersCount(): number {
    return this.orders.filter((o) => ['received', 'preparing', 'ready'].includes(this.statusKey(o))).length;
  }

  get completedSalesTotal(): number {
    return this.orders
      .filter((o) => this.statusKey(o) === 'completed')
      .reduce((sum, o) => sum + this.toAmount(o.total_amount), 0);
  }

  get completedOrdersCount(): number {
    return this.orders.filter((o) => this.statusKey(o) === 'completed').length;
  }

  get pendingGcashCount(): number {
    return this.orders.filter(
      (o) =>
        String(o.payment_method || '').toLowerCase() === 'gcash' &&
        ['received', 'preparing'].includes(this.statusKey(o))
    ).length;
  }

  get recentOrders(): AdminOrderRow[] {
    return this.orders.slice(0, 5);
  }

  get filteredOrders(): AdminOrderRow[] {
    const term = this.orderSearch.trim().toLowerCase().replace('#', '');

    return this.orders.filter((order) => {
      const status = this.statusKey(order);

      const matchesStatus =
        this.statusFilter === 'all' ||
        (this.statusFilter === 'active'
          ? ['received', 'preparing', 'ready'].includes(status)
          : status === this.statusFilter);

      const matchesPayment =
        this.paymentFilter === 'all' ||
        String(order.payment_method || '').toLowerCase() === this.paymentFilter;

      const matchesSearch =
        !term ||
        String(order.id).includes(term) ||
        this.customerLabel(order).toLowerCase().includes(term);

      return matchesStatus && matchesPayment && matchesSearch;
    });
  }

  get filteredMenuItems(): MenuItemRow[] {
    const term = this.menuSearch.trim().toLowerCase();
    if (!term) return this.menuItems;

    return this.menuItems.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        String(item.category_name || '').toLowerCase().includes(term)
    );
  }

  loadAll(): void {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.http.get<AdminOrderRow[]>(`${this.apiBase}/api/admin/orders`).subscribe({
      next: (rows) => {
        this.orders = Array.isArray(rows) ? rows : [];

        const currentId = this.selectedOrder?.id;
        const found = this.orders.find((o) => o.id === currentId);

        if (found) {
          this.selectedOrder = found;
        } else {
          const first = this.filteredOrders[0] || this.orders[0] || null;
          this.selectedOrder = first;
          this.syncDetail();
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

    this.http.get<AdminUserRow[]>(`${this.apiBase}/api/admin/users`).subscribe({
      next: (rows) => {
        this.users = Array.isArray(rows) ? rows : [];
        this.cdr.detectChanges();
      },
      error: () => {}
    });

    this.http.get<CategoryRow[]>(`${this.apiBase}/api/categories`).subscribe({
      next: (rows) => {
        this.categories = Array.isArray(rows) ? rows : [];
        if (this.categories.length > 0 && !this.editingItemId) {
          this.itemForm.category_id = this.categories[0].id;
        }
        this.cdr.detectChanges();
      },
      error: () => {}
    });

    this.http.get<MenuItemRow[]>(`${this.apiBase}/api/menu-items`).subscribe({
      next: (rows) => {
        this.menuItems = Array.isArray(rows) ? rows : [];
        this.cdr.detectChanges();
      },
      error: () => {}
    });

    this.http
      .get<{ loginLogs: LoginLogRow[]; orderLogs: OrderLogRow[] }>(`${this.apiBase}/api/admin/logs`)
      .subscribe({
        next: (data) => {
          this.loginLogs = Array.isArray(data?.loginLogs) ? data.loginLogs : [];
          this.orderLogs = Array.isArray(data?.orderLogs) ? data.orderLogs : [];
          this.cdr.detectChanges();
        },
        error: () => {}
      });
  }

  private syncDetail(): void {
    this.detailStatus = this.selectedOrder ? this.statusKey(this.selectedOrder) : 'received';
    this.detailWait = this.selectedOrder?.estimated_wait_minutes ?? null;
  }

  openTab(tab: AdminTab): void {
    this.activeTab = tab;
  }

  selectOrder(order: AdminOrderRow): void {
    this.selectedOrder = order;
    this.syncDetail();
  }

  setStatusFilter(value: string): void {
    this.statusFilter = value;
  }

  saveOrderDetails(): void {
    const order = this.selectedOrder;
    if (!order) return;

    this.message = '';
    this.errorMessage = '';

    const body: Record<string, unknown> = { status: this.detailStatus };
    const wait = Number(this.detailWait);
    if (this.detailWait !== null && Number.isFinite(wait) && wait > 0) {
      body['estimatedWaitMinutes'] = wait;
    }

    this.http.patch(`${this.apiBase}/api/orders/${order.id}/status`, body).subscribe({
      next: () => {
        this.message = `Order #${order.id} saved.`;
        this.loadAll();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to update the order.';
        this.cdr.detectChanges();
      }
    });
  }

  toggleUserStatus(user: AdminUserRow): void {
    this.message = '';
    this.errorMessage = '';

    const nextStatus = String(user.status || '').toLowerCase() === 'disabled' ? 'active' : 'disabled';

    this.http.patch(`${this.apiBase}/api/users/${user.id}/status`, { status: nextStatus }).subscribe({
      next: () => {
        user.status = nextStatus;
        this.message = `${user.name} (${user.email}) is now ${nextStatus}.`;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to update account status.';
        this.cdr.detectChanges();
      }
    });
  }

  createStaff(): void {
    this.message = '';
    this.errorMessage = '';

    const payload = {
      name: this.staffForm.name.trim(),
      email: this.staffForm.email.trim(),
      password: this.staffForm.password
    };

    if (!payload.name || !payload.email || !payload.password) {
      this.errorMessage = 'Please fill in the staff name, email, and password.';
      return;
    }

    this.http.post(`${this.apiBase}/api/admin/staff`, payload).subscribe({
      next: () => {
        this.message = `Staff account created for ${payload.name}.`;
        this.staffForm = { name: '', email: '', password: '' };
        this.loadAll();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to create staff account.';
        this.cdr.detectChanges();
      }
    });
  }

  addCategory(): void {
    const trimmed = this.newCategoryName.trim();
    if (!trimmed) return;

    this.message = '';
    this.errorMessage = '';

    this.http.post(`${this.apiBase}/api/admin/categories`, { name: trimmed }).subscribe({
      next: () => {
        this.newCategoryName = '';
        this.message = `Category "${trimmed}" added.`;
        this.loadAll();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to add category.';
        this.cdr.detectChanges();
      }
    });
  }

  deleteCategory(cat: CategoryRow): void {
    this.message = '';
    this.errorMessage = '';

    this.http.delete(`${this.apiBase}/api/admin/categories/${cat.id}`).subscribe({
      next: () => {
        this.message = `Category "${cat.name}" deleted.`;
        this.loadAll();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to delete category.';
        this.cdr.detectChanges();
      }
    });
  }

  startEditItem(item: MenuItemRow): void {
    this.editingItemId = item.id;
    this.itemForm = {
      category_id: Number(item.category_id),
      name: item.name,
      description: item.description || '',
      price: this.toAmount(item.price),
      image_url: item.image_url || '',
      is_available: this.isAvailable(item.is_available)
    };
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  resetItemForm(): void {
    this.editingItemId = null;
    this.itemForm = {
      category_id: this.categories[0]?.id || 1,
      name: '',
      description: '',
      price: 0,
      image_url: '',
      is_available: true
    };
  }

  saveMenuItem(): void {
    this.message = '';
    this.errorMessage = '';

    const payload = {
      category_id: Number(this.itemForm.category_id),
      name: this.itemForm.name.trim(),
      description: this.itemForm.description.trim(),
      price: this.toAmount(this.itemForm.price),
      image_url: this.itemForm.image_url.trim() || null,
      is_available: this.itemForm.is_available ? 1 : 0
    };

    if (!payload.name || payload.price < 0) {
      this.errorMessage = 'Please provide a valid item name and price.';
      return;
    }

    const req$ = this.editingItemId
      ? this.http.put(`${this.apiBase}/api/admin/menu-items/${this.editingItemId}`, payload)
      : this.http.post(`${this.apiBase}/api/admin/menu-items`, payload);

    req$.subscribe({
      next: () => {
        this.message = this.editingItemId ? 'Menu item updated.' : 'Menu item added.';
        this.resetItemForm();
        this.loadAll();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to save menu item.';
        this.cdr.detectChanges();
      }
    });
  }

  quickUpdatePrice(item: MenuItemRow, newPriceInput: string): void {
    const nextPrice = Number(newPriceInput);
    if (!Number.isFinite(nextPrice) || nextPrice < 0) {
      this.errorMessage = 'Invalid price value.';
      return;
    }

    this.message = '';
    this.errorMessage = '';

    this.http
      .patch(`${this.apiBase}/api/admin/menu-items/${item.id}/price`, { price: nextPrice })
      .subscribe({
        next: () => {
          item.price = nextPrice;
          this.message = `Updated price for "${item.name}" to ₱${nextPrice.toFixed(2)}.`;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.errorMessage = err?.error?.message || 'Failed to update price.';
          this.cdr.detectChanges();
        }
      });
  }

  toggleAvailability(item: MenuItemRow): void {
    const nextAvail = !this.isAvailable(item.is_available);

    this.message = '';
    this.errorMessage = '';

    this.http
      .patch(`${this.apiBase}/api/admin/menu-items/${item.id}/availability`, { is_available: nextAvail })
      .subscribe({
        next: () => {
          item.is_available = nextAvail ? 1 : 0;
          this.message = `"${item.name}" is now ${nextAvail ? 'available' : 'unavailable'}.`;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.errorMessage = err?.error?.message || 'Failed to update availability.';
          this.cdr.detectChanges();
        }
      });
  }

  deleteMenuItem(item: MenuItemRow): void {
    if (!confirm(`Delete "${item.name}"?`)) return;

    this.message = '';
    this.errorMessage = '';

    this.http.delete(`${this.apiBase}/api/admin/menu-items/${item.id}`).subscribe({
      next: () => {
        this.message = `Deleted "${item.name}".`;
        if (this.editingItemId === item.id) this.resetItemForm();
        this.loadAll();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to delete menu item.';
        this.cdr.detectChanges();
      }
    });
  }
}