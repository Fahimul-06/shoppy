import type { Product } from '../types';

export function getProductOrderId(product: Partial<Product> & Record<string, unknown>): string {
  return String(
    product.baseProductId ||
    product.productId ||
    product.product_id ||
    product.id ||
    product._id ||
    product.legacyId ||
    ''
  ).trim();
}

export function hasProductOrderId(product: Partial<Product> & Record<string, unknown>): boolean {
  return getProductOrderId(product).length > 0;
}
