import { supabase } from './supabase';
import type { Product, Category, HeroSlide } from '../types';

function rowToProduct(row: Record<string, unknown>): Product {
  return {
    id: (row.legacy_id as string) ?? (row.id as string),
    name: row.name as string,
    price: Number(row.price),
    originalPrice: row.original_price ? Number(row.original_price) : undefined,
    image: row.image as string,
    images: (row.images as string[]) ?? [],
    category: row.category_slug as string,
    brand: (row.brand as string) ?? undefined,
    rating: Number(row.rating ?? 0),
    reviewCount: Number(row.review_count ?? 0),
    badge: (row.badge as 'sale' | 'new' | 'hot') ?? undefined,
    discount: row.discount ? Number(row.discount) : undefined,
    stock: row.stock ? Number(row.stock) : undefined,
    description: (row.description as string) ?? undefined,
    features: (row.features as string[]) ?? [],
    specifications: (row.specifications as Record<string, string>) ?? {},
  };
}

function rowToCategory(row: Record<string, unknown>): Category {
  return { id: row.id as string, name: row.name as string, image: row.image as string, slug: row.slug as string };
}

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from('products').select('*').eq('active', true).order('created_at', { ascending: false });
  if (error) throw error;
  return ((data as Record<string, unknown>[]) ?? []).map(rowToProduct);
}

export async function fetchProductsByCategory(slug: string): Promise<Product[]> {
  const { data, error } = await supabase.from('products').select('*').eq('active', true).eq('category_slug', slug).order('created_at', { ascending: false });
  if (error) throw error;
  return ((data as Record<string, unknown>[]) ?? []).map(rowToProduct);
}

export async function fetchProductsByBadge(badge: 'sale' | 'new' | 'hot'): Promise<Product[]> {
  const { data, error } = await supabase.from('products').select('*').eq('active', true).eq('badge', badge).order('created_at', { ascending: false });
  if (error) throw error;
  return ((data as Record<string, unknown>[]) ?? []).map(rowToProduct);
}

export async function fetchProductById(id: string): Promise<Product | null> {
  const { data, error } = await supabase.from('products').select('*').eq('legacy_id', id).maybeSingle();
  if (error) throw error;
  return data ? rowToProduct(data as Record<string, unknown>) : null;
}

export async function searchProducts(query: string): Promise<Product[]> {
  const { data, error } = await supabase.from('products').select('*').eq('active', true).or(`name.ilike.%${query}%,brand.ilike.%${query}%,description.ilike.%${query}%`).order('rating', { ascending: false });
  if (error) throw error;
  return ((data as Record<string, unknown>[]) ?? []).map(rowToProduct);
}

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
  if (error) throw error;
  return ((data as Record<string, unknown>[]) ?? []).map(rowToCategory);
}

export async function fetchHeroSlides(): Promise<HeroSlide[]> {
  const { data, error } = await supabase.from('hero_slides').select('*').eq('active', true).order('sort_order', { ascending: true });
  if (error) throw error;
  return ((data as Record<string, unknown>[]) ?? []).map((row) => ({
    id: row.id as string,
    image: row.image as string,
    title: row.title as string,
    subtitle: (row.subtitle as string) ?? '',
  }));
}

export interface OrderPayload {
  subtotal: number;
  discount_amount: number;
  delivery_fee: number;
  total_amount: number;
  payment_method: string;
  shipping_address: Record<string, string>;
  items: Array<{
    product_id: string | null;
    product_snapshot: Record<string, unknown>;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
}

export async function placeOrder(payload: OrderPayload) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data: order, error: orderErr } = await supabase.from('orders').insert({
    user_id: user.id,
    subtotal: payload.subtotal,
    discount_amount: payload.discount_amount,
    delivery_fee: payload.delivery_fee,
    total_amount: payload.total_amount,
    payment_method: payload.payment_method,
    payment_status: 'pending',
    shipping_address: payload.shipping_address,
  }).select().single();
  if (orderErr) throw orderErr;
  const orderRow = order as Record<string, unknown>;
  const itemRows = payload.items.map((item) => ({ ...item, order_id: orderRow.id }));
  const { error: itemsErr } = await supabase.from('order_items').insert(itemRows);
  if (itemsErr) throw itemsErr;
  return order;
}

export async function fetchUserOrders() {
  const { data, error } = await supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchWishlist(): Promise<Product[]> {
  const { data, error } = await supabase.from('wishlists').select('product_id, products(*)').order('created_at', { ascending: false });
  if (error) throw error;
  return ((data as Array<{ products?: Record<string, unknown> }>) ?? []).map((row) => row.products).filter(Boolean).map((row) => rowToProduct(row as Record<string, unknown>));
}

export async function toggleWishlist(productUuid: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data: existing } = await supabase.from('wishlists').select('id').eq('user_id', user.id).eq('product_id', productUuid).maybeSingle();
  if (existing) {
    await supabase.from('wishlists').delete().eq('id', (existing as { id: string }).id);
    return false;
  }
  await supabase.from('wishlists').insert({ user_id: user.id, product_id: productUuid });
  return true;
}
