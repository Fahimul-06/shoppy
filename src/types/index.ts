export interface SellerSummary {
  id?: string;
  _id?: string;
  name?: string;
  shopName?: string;
  shopLogo?: string;
  shopAddress?: string;
  status?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  images?: string[];
  category: string;
  subcategory?: string;
  childCategory?: string;
  rating: number;
  reviewCount: number;
  badge?: 'sale' | 'new' | 'hot';
  discount?: number;
  isDailySale?: boolean;
  isFlashSale?: boolean;
  saleStartAt?: string;
  saleEndAt?: string;
  brand?: string;
  description?: string;
  specifications?: Record<string, string>;
  features?: string[];
  stock?: number;
  active?: boolean;
  seller?: SellerSummary | string | null;
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
  photos?: string[];
  user?: { fullName?: string; email?: string; profilePhoto?: string };
}
