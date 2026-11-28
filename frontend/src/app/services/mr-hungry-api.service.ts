import { API_URL } from '../config';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SignupPayload {
  fullName?: string;
  name?: string;
  email: string;
  password: string;
  phoneNumber?: string;
  phone_number?: string;
}

export interface CreateOrderPayload {
  customerId: number;
  orderType: 'dine-in' | 'take-out';
  paymentMethod: 'counter' | 'gcash';
  paymentProof: string | null;
  items: {
    id: number;
    name: string;
    quantity: number;
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class MrHungryApiService {
    private readonly baseUrl = `${API_URL}/api`;
    
  constructor(private http: HttpClient) {}

  login(payload: LoginPayload): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/login`, payload);
  }

  signup(payload: SignupPayload): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/signup`, payload);
  }

  createOrder(payload: CreateOrderPayload): Observable<any> {
    return this.http.post(`${this.baseUrl}/orders`, payload);
  }

  getOrders(): Observable<any> {
    return this.http.get(`${this.baseUrl}/orders`, {
      params: { _t: String(Date.now()) },
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache'
      }
    });
  }

  getOrdersByCustomer(customerId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/orders/customer/${Number(customerId)}`, {
      params: { _t: String(Date.now()) },
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache'
      }
    });
  }

  disableAccount(userId: number): Observable<any> {
    return this.http.patch(`${this.baseUrl}/users/${Number(userId)}/disable`, {});
  }
}