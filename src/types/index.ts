export interface SellerSummary {
  id?: string;
  _id?: string;
  name?: string;
  shopName?: string;
  shopLogo?: string;
  shopBanner?: string;
  shopAddress?: string;
  status?: string;
  rating?: number;
  reviewCount?: number;
  productCount?: number;
  soldCount?: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  images?: string[];
  colorOptions?: string[];
  sizeOptions?: string[];
  selectedColor?: string;
  selectedSize?: string;
  baseProductId?: string;
  category: string;
  subcategory?: string;
  childCategory?: string;
  rating: number;
  reviewCount: number;
  badge?: 'sale' | 'new' | 'hot';
  saleTags?: Array<'daily' | 'flash'>;
  discount?: number;
  dailySaleDiscount?: number;
  flashSaleDiscount?: number;
  newArrival?: boolean;
  soldCount?: number;
  createdAt?: string;
  currentSaleType?: 'daily' | 'flash';
  currentSaleDiscount?: number;
  currentSalePrice?: number;
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
  link?: string;
  placement?: 'hero' | 'header' | 'event' | 'voucher' | 'campaign';
  targetType?: 'all' | 'category' | 'brand' | 'seller' | 'products' | 'customLink';
  targetValue?: string;
  productIds?: string[];
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
