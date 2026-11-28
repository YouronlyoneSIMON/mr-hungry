import { Routes } from '@angular/router';
import { Home } from './home/home';
import { Auth } from './auth/auth';
import { LocationsMap } from './locations-map/locations-map';
import { Cart } from './cart/cart';
import { Menu } from './menu/menu';
import { OrderHistory } from './order-history/order-history';
import { Admin } from './admin/admin';
import { AdminSales } from './admin-sales/admin-sales';
import { Staff } from './staff/staff';
import { StaffWalkin } from './staff-walkin/staff-walkin';
import { Account } from './account/account';

export const routes: Routes = [
  { path: '', component: Home, pathMatch: 'full' },
  { path: 'home', component: Home },
  { path: 'menu', component: Menu },
  { path: 'map', component: LocationsMap },
  { path: 'cart', component: Cart },
  { path: 'checkout', component: Cart },
  { path: 'orders', component: OrderHistory },
  { path: 'account', component: Account },
  { path: 'login', component: Auth },
  { path: 'signup', component: Auth },
  { path: 'admin', component: Admin },
  { path: 'admin/sales', component: AdminSales },
  { path: 'staff', component: Staff },
  { path: 'staff/new-order', component: StaffWalkin }
];