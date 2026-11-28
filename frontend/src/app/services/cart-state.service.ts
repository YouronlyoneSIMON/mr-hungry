import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface OrderCartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  category?: string;
}

const STORAGE_KEY = 'mr_hungry_cart';

@Injectable({
  providedIn: 'root'
})
export class CartStateService {
  private itemsSubject = new BehaviorSubject<OrderCartItem[]>(this.loadInitialItems());
  items$ = this.itemsSubject.asObservable();

  get items(): OrderCartItem[] {
    return this.itemsSubject.value;
  }

  get totalItemCount(): number {
    return this.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  }

  get totalAmount(): number {
    return this.items.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
      0
    );
  }

  private loadInitialItems(): OrderCartItem[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((x: any) => ({
          id: Number(x?.id),
          name: String(x?.name ?? ''),
          price: Number(x?.price ?? 0),
          quantity: Math.max(1, Number(x?.quantity ?? 1)),
          category: x?.category ? String(x.category) : undefined
        }))
        .filter((x) => Number.isInteger(x.id) && x.id > 0 && x.name.length > 0);
    } catch {
      return [];
    }
  }

  private persist(nextItems: OrderCartItem[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextItems));
    this.itemsSubject.next(nextItems);
  }

  addItem(dish: { id: number; name: string; price: number; category?: string }, qty = 1): void {
    const addQty = Math.max(1, Number(qty) || 1);
    const current = [...this.items];
    const index = current.findIndex((i) => Number(i.id) === Number(dish.id));

    if (index >= 0) {
      current[index] = {
        ...current[index],
        quantity: current[index].quantity + addQty
      };
    } else {
      current.push({
        id: Number(dish.id),
        name: String(dish.name),
        price: Number(dish.price),
        quantity: addQty,
        category: dish.category
      });
    }

    this.persist(current);
  }

  updateQuantity(index: number, delta: number): void {
    const current = [...this.items];
    const target = current[index];
    if (!target) return;

    const nextQty = target.quantity + delta;
    if (nextQty <= 0) {
      current.splice(index, 1);
    } else {
      current[index] = { ...target, quantity: nextQty };
    }
    this.persist(current);
  }

  removeItem(index: number): void {
    const current = [...this.items];
    current.splice(index, 1);
    this.persist(current);
  }

  clearCart(): void {
    this.persist([]);
  }
}