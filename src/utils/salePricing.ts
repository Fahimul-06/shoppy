import type { Product } from '../types';

const num = (value: unknown) => Number(value || 0);

export function getSaleDiscount(product: Product, preferredSale?: 'daily' | 'flash') {
  const tags = Array.isArray(product.saleTags) ? product.saleTags : [];
  const daily = tags.includes('daily') ? num(product.dailySaleDiscount) : 0;
  const flash = tags.includes('flash') ? num(product.flashSaleDiscount) : 0;

  if (preferredSale === 'daily') return Math.max(0, daily || (tags.includes('daily') ? num(product.discount) : 0));
  if (preferredSale === 'flash') return Math.max(0, flash || (tags.includes('flash') ? num(product.discount) : 0));

  return Math.max(0, daily, flash, num(product.discount));
}

export function getSalePrice(product: Product, preferredSale?: 'daily' | 'flash') {
  const price = num(product.price);
  const discount = getSaleDiscount(product, preferredSale);
  if (!discount || discount <= 0) return price;
  return Math.max(0, Math.round(price - (price * discount / 100)));
}

export function getDisplayOriginalPrice(product: Product, preferredSale?: 'daily' | 'flash') {
  const salePrice = getSalePrice(product, preferredSale);
  const price = num(product.price);
  const originalPrice = num(product.originalPrice);
  if (salePrice < price) return price;
  if (originalPrice > price) return originalPrice;
  return undefined;
}

export function withSalePricing(product: Product, preferredSale?: 'daily' | 'flash'): Product {
  const salePrice = getSalePrice(product, preferredSale);
  const original = getDisplayOriginalPrice(product, preferredSale);
  const discount = getSaleDiscount(product, preferredSale);
  return {
    ...product,
    price: salePrice,
    originalPrice: original,
    discount: discount || product.discount,
    currentSaleType: preferredSale,
    currentSaleDiscount: discount,
    currentSalePrice: salePrice,
  };
}
