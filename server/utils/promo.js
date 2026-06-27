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

function validDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isPromoActive(promo, now = new Date(), options = {}) {
  if (!promo || promo.active === false) return false;

  // Existing admin-created promos may contain timezone-shifted startsAt values
  // from date inputs. For checkout/customer validation we should not reject a
  // promo only because startsAt is a few hours/days ahead; expiry and active
  // status are the important safety checks. Pass strictStart=true only where
  // a hard scheduled launch is required.
  if (options.strictStart) {
    const starts = validDate(promo.startsAt || promo.startDate || promo.validFrom);
    if (starts && starts > now) return false;
  }

  const expires = validDate(promo.expiresAt || promo.expiryDate || promo.expiresOn || promo.endDate || promo.validUntil);
  if (expires && expires < now) return false;

  const maxUses = Number(promo.maxUses || promo.usageLimit || 0);
  if (maxUses > 0 && Number(promo.usedCount || promo.used || 0) >= maxUses) return false;
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
  const discountType = promo.discountType || promo.type || 'percentage';
  const discountValue = Number(promo.discountValue ?? promo.discount ?? promo.value ?? promo.amount ?? 0);
  let discount = discountType === 'percentage'
    ? Math.round((eligibleSubtotal * discountValue) / 100)
    : discountValue;
  if (promo.maxDiscountAmount && Number(promo.maxDiscountAmount) > 0) {
    discount = Math.min(discount, Number(promo.maxDiscountAmount));
  }
  discount = Math.max(0, Math.min(discount, eligibleSubtotal));
  return { discount, eligibleSubtotal, eligibleItems };
}
