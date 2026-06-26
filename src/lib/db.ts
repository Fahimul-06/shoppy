import type { Product, Category, HeroSlide } from '../types';
import { apiFetch } from './api';

export async function fetchProducts(): Promise<Product[]> {
  return apiFetch<Product[]>('/api/products');
}

export async function fetchProductsByCategory(slug: string): Promise<Product[]> {
  return apiFetch<Product[]>(`/api/products?category=${encodeURIComponent(slug)}`);
}

export async function fetchProductsByBadge(badge: 'sale' | 'new' | 'hot'): Promise<Product[]> {
  return apiFetch<Product[]>(`/api/products?badge=${badge}`);
}

export async function fetchProductById(id: string): Promise<Product | null> {
  try {
    return await apiFetch<Product>(`/api/products/${encodeURIComponent(id)}`);
  } catch {
    return null;
  }
}

export async function searchProducts(query: string): Promise<Product[]> {
  return apiFetch<Product[]>(`/api/products?search=${encodeURIComponent(query)}`);
}

export async function fetchCategories(): Promise<Category[]> {
  return apiFetch<Category[]>('/api/categories');
}

export async function fetchHeroSlides(): Promise<HeroSlide[]> {
  return apiFetch<HeroSlide[]>('/api/hero-slides');
}

export interface OrderPayload {
  subtotal: number;
  discountAmount?: number;
  deliveryFee?: number;
  totalAmount: number;
  paymentMethod: string;
  shippingAddress: Record<string, string>;
  customer?: Record<string, string>;
  items: Array<{
    productId: string | null;
    productSnapshot: Record<string, unknown>;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}

export async function placeOrder(payload: OrderPayload) {
  return apiFetch('/api/orders', { method: 'POST', body: JSON.stringify(payload) });
}

export async function fetchUserOrders() {
  return apiFetch('/api/orders/my');
}

export async function validatePromoCode(code: string, subtotal: number) {
  return apiFetch<{ code: string; discountAmount: number; promo: unknown }>('/api/promo-codes/validate', {
    method: 'POST',
    body: JSON.stringify({ code, subtotal }),
  });
}

export async function fetchWishlist(): Promise<Product[]> {
  return [];
}

export async function toggleWishlist(): Promise<boolean> {
  throw new Error('Wishlist API is not implemented yet in the MongoDB backend.');
}
