export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  images?: string[];
  category: string;
  rating: number;
  reviewCount: number;
  badge?: 'sale' | 'new' | 'hot';
  discount?: number;
  brand?: string;
  description?: string;
  specifications?: Record<string, string>;
  features?: string[];
  stock?: number;
}

export interface Category {
  id: string;
  name: string;
  image: string;
  slug: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface HeroSlide {
  id: string;
  image: string;
  title: string;
  subtitle: string;
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  date: string;
  comment: string;
  verified: boolean;
}
