import { api, getToken } from './api';
import type { Product, Category, HeroSlide } from '../types';

export async function fetchProducts(): Promise<Product[]> {
  const { products } = await api.get<{ products: Product[] }>('/products');
  return products;
}

export async function fetchProductsByCategory(slug: string): Promise<Product[]> {
  if (slug === 'all') return fetchProducts();
  const { products } = await api.get<{ products: Product[] }>(`/products?category=${encodeURIComponent(slug)}`);
  return products;
}

export async function fetchProductsByBadge(badge: 'sale' | 'new' | 'hot'): Promise<Product[]> {
  const { products } = await api.get<{ products: Product[] }>(`/products?badge=${badge}`);
  return products;
}

export async function fetchProductById(id: string): Promise<Product | null> {
  const { product } = await api.get<{ product: Product | null }>(`/products/${id}`);
  return product;
}

export async function fetchRelatedProducts(productId: string): Promise<Product[]> {
  const { products } = await api.get<{ products: Product[] }>(`/products/${encodeURIComponent(productId)}/related`);
  return products;
}

export async function searchProducts(query: string): Promise<Product[]> {
  const { products } = await api.get<{ products: Product[] }>(`/products?search=${encodeURIComponent(query)}`);
  return products;
}


export async function searchProductsByImage(file: File): Promise<{ products: Product[]; labels: string[]; message?: string }> {
  const formData = new FormData();
  formData.append('file', file);
  return api.upload<{ products: Product[]; labels: string[]; message?: string }>('/products/image-search', formData);
}

export async function fetchCategories(): Promise<Category[]> {
  const { categories } = await api.get<{ categories: Category[] }>('/categories');
  return categories;
}

export async function fetchHeroSlides(): Promise<HeroSlide[]> {
  const { heroSlides } = await api.get<{ heroSlides: HeroSlide[] }>('/hero-slides');
  return heroSlides;
}

export interface OrderPayload {
  subtotal: number;
  discount_amount: number;
  delivery_fee: number;
  total_amount: number;
  payment_method: string;
  shipping_address: Record<string, string>;
  items: Array<{
    product_id: string;
    product_snapshot: Record<string, unknown>;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
}

export async function placeOrder(payload: OrderPayload) {
  const { order } = await api.post<{ order: any }>('/orders', payload, getToken('user'));
  return order;
}

export async function fetchUserOrders() {
  const { orders } = await api.get<{ orders: any[] }>('/orders/my', getToken('user'));
  return orders;
}

export async function fetchWishlist(): Promise<Product[]> {
  const { products } = await api.get<{ products: Product[] }>('/wishlist', getToken('user'));
  return products;
}

export async function toggleWishlist(productId: string): Promise<boolean> {
  const { wishlisted } = await api.post<{ wishlisted: boolean }>('/wishlist/toggle', { productId }, getToken('user'));
  return wishlisted;
}


export async function fetchWishlistIds(): Promise<string[]> {
  const { productIds } = await api.get<{ productIds: string[] }>('/wishlist/ids', getToken('user'));
  return productIds;
}

export async function fetchWishlistStatus(productId: string): Promise<boolean> {
  const { wishlisted } = await api.get<{ wishlisted: boolean }>(`/wishlist/${productId}/status`, getToken('user'));
  return wishlisted;
}

export async function fetchUserReturns() {
  const { returns } = await api.get<{ returns: any[] }>('/orders/returns/my', getToken('user'));
  return returns;
}

export async function requestReturn(payload: { orderId: string; orderItemId: string; reason: string; details?: string; quantity?: number }) {
  const { returnRequest } = await api.post<{ returnRequest: any }>('/orders/returns', payload, getToken('user'));
  return returnRequest;
}

export async function fetchUserCancellations() {
  const { cancellations } = await api.get<{ cancellations: any[] }>('/orders/cancellations/my', getToken('user'));
  return cancellations;
}

export async function cancelOrderedProduct(payload: { orderId: string; orderItemId: string; reason?: string }) {
  const { cancellation } = await api.post<{ cancellation: any }>('/orders/cancellations', payload, getToken('user'));
  return cancellation;
}
