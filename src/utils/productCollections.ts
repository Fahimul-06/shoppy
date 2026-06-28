import type { Product } from '../types';
import { getSalePrice } from './salePricing';

const n = (value: unknown) => Number(value || 0);

export function isNewArrival(product: Product) {
  return Boolean(product.newArrival) || product.badge === 'new';
}

export function is99TkProduct(product: Product) {
  const basePrice = n(product.price);
  const dailyPrice = getSalePrice(product, 'daily');
  const flashPrice = getSalePrice(product, 'flash');
  return basePrice === 99 || dailyPrice === 99 || flashPrice === 99;
}

export function bestSellingScore(product: Product) {
  return n(product.soldCount) * 1000 + n(product.reviewCount) * 10 + n(product.rating);
}

export function getNewArrivalProducts(products: Product[], limit = 12) {
  return [...products]
    .filter(isNewArrival)
    .sort((a, b) => new Date(String(b.createdAt || 0)).getTime() - new Date(String(a.createdAt || 0)).getTime())
    .slice(0, limit);
}

export function get99TkProducts(products: Product[], limit = 12) {
  return [...products]
    .filter(is99TkProduct)
    .sort((a, b) => n(a.price) - n(b.price))
    .slice(0, limit);
}

export function getBestSellingProducts(products: Product[], limit = 12) {
  return [...products]
    .filter((p) => bestSellingScore(p) > 0 || n(p.rating) > 0)
    .sort((a, b) => bestSellingScore(b) - bestSellingScore(a))
    .slice(0, limit);
}

export function categoryKey(value: unknown) {
  return String(value || '').trim().toLowerCase().replace(/&/g, ' and ').replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
