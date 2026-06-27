const normalize = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/&/g, ' and ')
  .replace(/['’]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const toId = (value) => value?._id?.toString?.() || value?.id?.toString?.() || value?.toString?.() || '';
const list = (items) => Array.isArray(items) ? items : [];

export function isPromoActive(promo, now = new Date()) {
  if (!promo || promo.active === false) return false;
  if (promo.startsAt && new Date(promo.startsAt) > now) return false;
  if (promo.expiresAt && new Date(promo.expiresAt) < now) return false;
  if (promo.maxUses && Number(promo.usedCount || 0) >= Number(promo.maxUses)) return false;
  return true;
}

export function promoMatchesProduct(promo, product) {
  if (!promo || !product) return false;
  if (promo.appliesTo === 'all') return true;

  const productId = toId(product);
  const sellerId = toId(product.seller);
  const normalizedCategory = normalize(product.category);
  const normalizedSubcategory = normalize(product.subcategory || product.subCategory);
  const normalizedChild = normalize(product.childCategory || product.subSubCategory);
  const normalizedBrand = normalize(product.brand);

  const productTargets = list(promo.products).map(toId).filter(Boolean);
  if (promo.product) productTargets.push(toId(promo.product));
  if (productTargets.length && productTargets.includes(productId)) return true;

  const sellerTargets = list(promo.sellers).map(toId).filter(Boolean);
  if (sellerTargets.length && sellerId && sellerTargets.includes(sellerId)) return true;

  const brandTargets = list(promo.brands).map(normalize).filter(Boolean);
  if (brandTargets.length && normalizedBrand && brandTargets.includes(normalizedBrand)) return true;

  const categoryTargets = list(promo.categories).map(normalize).filter(Boolean);
  if (promo.categorySlug) categoryTargets.push(normalize(promo.categorySlug));
  if (categoryTargets.length && categoryTargets.includes(normalizedCategory)) return true;

  const subTargets = list(promo.subcategories).map(normalize).filter(Boolean);
  if (subTargets.length && subTargets.includes(normalizedSubcategory)) return true;

  const childTargets = list(promo.childCategories).map(normalize).filter(Boolean);
  if (childTargets.length && childTargets.includes(normalizedChild)) return true;

  return false;
}

export function eligibleItemsForPromo(promo, items = []) {
  return items.filter((item) => promoMatchesProduct(promo, item.product || item.product_snapshot || item));
}

export function calculatePromoDiscount(promo, items = [], subtotalOverride = null) {
  const eligibleItems = promo.appliesTo === 'all' ? items : eligibleItemsForPromo(promo, items);
  const eligibleSubtotal = subtotalOverride != null
    ? Number(subtotalOverride || 0)
    : eligibleItems.reduce((sum, item) => {
      const quantity = Number(item.quantity || 1);
      const unit = Number(item.unit_price ?? item.unitPrice ?? item.product?.price ?? item.product_snapshot?.price ?? item.price ?? 0);
      return sum + (quantity * unit);
    }, 0);

  if (eligibleSubtotal <= 0) return { discount: 0, eligibleSubtotal, eligibleItems };
  let discount = promo.discountType === 'percentage'
    ? Math.round((eligibleSubtotal * Number(promo.discountValue || 0)) / 100)
    : Number(promo.discountValue || 0);
  if (promo.maxDiscountAmount && Number(promo.maxDiscountAmount) > 0) {
    discount = Math.min(discount, Number(promo.maxDiscountAmount));
  }
  discount = Math.max(0, Math.min(discount, eligibleSubtotal));
  return { discount, eligibleSubtotal, eligibleItems };
}
