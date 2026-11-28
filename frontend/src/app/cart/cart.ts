import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, timeout } from 'rxjs';
import { MrHungryApiService } from '../services/mr-hungry-api.service';
import { CartStateService } from '../services/cart-state.service';
import { getLoggedInUser } from '../auth-session';

type Step = 'cart' | 'checkout' | 'qr' | 'done';

interface PlacedOrder {
  id: number;
  total: number;
  orderType: 'dine-in' | 'take-out';
  paymentMethod: 'counter' | 'gcash';
}

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './cart.html',
  styleUrl: './cart.css'
})
export class Cart {
  step: Step = 'cart';

  orderType: 'dine-in' | 'take-out' = 'dine-in';
  paymentMethod: 'counter' | 'gcash' = 'counter';
  paymentProof = '';

  // Put your QR image at public/gcash-qr.png
  gcashQrUrl = 'gcash-qr.png';
  qrLoadFailed = false;

  isSubmitting = false;
  errorMessage = '';
  placed: PlacedOrder | null = null;

  constructor(
    public cartState: CartStateService,
    private api: MrHungryApiService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {
    const path = this.route.snapshot.routeConfig?.path || '';
    if (path === 'checkout' && this.cartState.items.length > 0) {
      this.step = 'checkout';
    }
  }

  get user() {
    return getLoggedInUser();
  }

  get isLoggedIn(): boolean {
    return Boolean(this.user?.id);
  }

  get isCustomer(): boolean {
    return String(this.user?.role || '').toLowerCase() === 'customer';
  }

  get userName(): string {
    return String(this.user?.name || this.user?.fullName || '');
  }

  get userEmail(): string {
    return String(this.user?.email || '');
  }

  get firstName(): string {
    return this.userName.split(' ')[0] || 'there';
  }

  private goTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onQrImageError(): void {
    this.qrLoadFailed = true;
    this.cdr.detectChanges();
  }

  updateQuantity(index: number, delta: number): void {
    this.cartState.updateQuantity(index, delta);
  }

  removeItem(index: number): void {
    this.cartState.removeItem(index);
  }

  clearCart(): void {
    this.cartState.clearCart();
  }

  goToCheckout(): void {
    this.errorMessage = '';
    this.step = 'checkout';
    this.goTop();
  }

  backToCart(): void {
    this.errorMessage = '';
    this.step = 'cart';
    this.goTop();
  }

  backToCheckout(): void {
    this.errorMessage = '';
    this.step = 'checkout';
    this.goTop();
  }

  continueFromCheckout(): void {
    this.errorMessage = '';

    if (this.paymentMethod === 'gcash') {
      this.step = 'qr';
      this.goTop();
    } else {
      this.placeOrder();
    }
  }

  placeOrder(): void {
    this.errorMessage = '';

    const user = this.user;
    if (!user?.id) {
      this.errorMessage = 'Please log in first before placing your order.';
      return;
    }

    if (this.cartState.items.length === 0) {
      this.errorMessage = 'Your cart is empty. Go back to the menu to add dishes.';
      return;
    }

    const trimmedRef = this.paymentProof.trim();
    if (this.paymentMethod === 'gcash' && !trimmedRef) {
      this.errorMessage = 'Please enter your GCash reference number after paying.';
      return;
    }

    const payloadItems = this.cartState.items
      .map((item) => ({
        id: Number(item.id),
        name: item.name,
        quantity: Math.max(1, Number(item.quantity) || 1)
      }))
      .filter((item) => Number.isInteger(item.id) && item.id > 0);

    if (payloadItems.length === 0) {
      this.errorMessage = 'Invalid cart items found. Please re-add them from the menu.';
      return;
    }

    const orderTotal = this.cartState.totalAmount;
    const orderType = this.orderType;
    const paymentMethod = this.paymentMethod;

    this.isSubmitting = true;

    this.api
      .createOrder({
        customerId: Number(user.id),
        orderType,
        paymentMethod,
        paymentProof: paymentMethod === 'gcash' ? trimmedRef : null,
        items: payloadItems
      })
      .pipe(
        timeout(10000),
        finalize(() => {
          this.isSubmitting = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (res: any) => {
          this.placed = {
            id: Number(res?.order?.id),
            total: Number(res?.order?.totalAmount ?? orderTotal),
            orderType,
            paymentMethod
          };
          this.paymentProof = '';
          this.cartState.clearCart();
          this.step = 'done';
          this.goTop();
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          this.errorMessage =
            err?.name === 'TimeoutError'
              ? 'Request timed out. Check if the backend server (port 5000) is running.'
              : err?.error?.message || `Failed to place order (${err?.status || 'error'}).`;
          this.cdr.detectChanges();
        }
      });
  }
}