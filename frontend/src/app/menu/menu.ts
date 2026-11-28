import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { CartStateService } from '../services/cart-state.service';
import { getLoggedInUser } from '../auth-session';
import { API_URL } from '../config';

export interface DishItem {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  available: boolean;
  imageUrl: string | null;
}

interface ApiCategory {
  id: number;
  name: string;
}

interface ApiMenuItem {
  id: number;
  category_id: number;
  category_name?: string;
  name: string;
  description: string | null;
  price: number | string;
  image_url: string | null;
  is_available: number | boolean;
}

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './menu.html',
  styleUrl: './menu.css'
})
export class Menu implements OnInit, OnDestroy {
    private readonly apiBase = API_URL;
  private toastTimer: any = null;

  categories: string[] = ['All'];
  selectedCategory = 'All';
  searchTerm = '';
  dishes: DishItem[] = [];

  loading = true;
  loadError = '';

  selectedDish: DishItem | null = null;
  quantity = 1;
  toast = '';

  constructor(
    private http: HttpClient,
    public cartState: CartStateService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadMenuFromApi();
  }

  ngOnDestroy(): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }

  get role(): string {
    return String(getLoggedInUser()?.role || '').toLowerCase();
  }

  get isGuest(): boolean {
    return !getLoggedInUser()?.id;
  }

  get canOrder(): boolean {
    return this.role === 'customer';
  }

  get filteredDishes(): DishItem[] {
    const term = this.searchTerm.trim().toLowerCase();

    return this.dishes.filter((d) => {
      const inCategory = this.selectedCategory === 'All' || d.category === this.selectedCategory;
      const matches =
        !term ||
        d.name.toLowerCase().includes(term) ||
        d.description.toLowerCase().includes(term);
      return inCategory && matches;
    });
  }

  loadMenuFromApi(): void {
    this.loading = true;
    this.loadError = '';

    this.http.get<ApiCategory[]>(`${this.apiBase}/api/categories`).subscribe({
      next: (cats) => {
        const names = Array.isArray(cats)
          ? cats.map((c) => String(c.name || '').trim()).filter(Boolean)
          : [];
        this.categories = ['All', ...names];
        this.cdr.detectChanges();
      },
      error: () => {}
    });

    this.http.get<ApiMenuItem[]>(`${this.apiBase}/api/menu-items`).subscribe({
      next: (items) => {
        this.dishes = (Array.isArray(items) ? items : []).map((row) => {
          const parsedPrice = Number(row.price);
          return {
            id: Number(row.id),
            name: String(row.name || '').trim(),
            description: String(row.description || '').trim(),
            price: Number.isFinite(parsedPrice) ? parsedPrice : 0,
            category: String(row.category_name || '').trim() || 'Uncategorized',
            available: Number(row.is_available) === 1 || row.is_available === true,
            imageUrl: row.image_url ? String(row.image_url) : null
          };
        });
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.loadError = 'Could not load the menu. Please check that the server is running.';
        this.cdr.detectChanges();
      }
    });
  }

  selectCategory(category: string): void {
    this.selectedCategory = category;
  }

  emoji(dish: DishItem): string {
    const text = `${dish.name} ${dish.category}`.toLowerCase();
    const rules: [RegExp, string][] = [
      [/burger/, '🍔'],
      [/wing|chicken/, '🍗'],
      [/sisig|rice|tapa|silog/, '🍚'],
      [/pasta|spaghetti|carbonara/, '🍝'],
      [/fries|sides/, '🍟'],
      [/sundae|ice cream|dessert/, '🍨'],
      [/salad/, '🥗'],
      [/sandwich/, '🥪'],
      [/quesadilla|taco/, '🌮'],
      [/drink|tea|cooler|coffee|macchiato|juice|soda/, '🥤']
    ];

    for (const [pattern, icon] of rules) {
      if (pattern.test(text)) return icon;
    }
    return '🍽️';
  }

  openDish(dish: DishItem): void {
    this.selectedDish = dish;
    this.quantity = 1;
  }

  closeDish(): void {
    this.selectedDish = null;
  }

  changeQty(delta: number): void {
    this.quantity = Math.min(50, Math.max(1, this.quantity + delta));
  }

  addSelectedToCart(): void {
    const dish = this.selectedDish;
    if (!dish || !dish.available) return;

    if (!this.canOrder) {
      this.router.navigate(['/login']);
      return;
    }

    this.cartState.addItem(
      { id: dish.id, name: dish.name, price: dish.price, category: dish.category },
      this.quantity
    );

    this.showToast(`${this.quantity} × ${dish.name} added to cart`);
    this.closeDish();
  }

  private showToast(text: string): void {
    this.toast = text;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toast = '';
      this.cdr.detectChanges();
    }, 2500);
  }
}