import express from 'express';
import PromoCode from '../models/PromoCode.js';
import Product from '../models/Product.js';
import { calculatePromoDiscount, isPromoActive, promoMatchesProduct, promoMatchesUsageConditions } from '../utils/promo.js';

const router = express.Router();
const promoPopulate = [
  { path: 'sellers', select: 'name shopName shopLogo status' },
  { path: 'products', select: 'name image price category subcategory childCategory brand seller' },
  { path: 'product', select: 'name image price category subcategory childCategory brand seller' },
];

function normalizePublicPromo(promo) {
  const obj = typeof promo?.toObject === 'function' ? promo.toObject({ virtuals: true }) : { ...(promo || {}) };
  const id = obj.id || obj._id?.toString?.() || '';
  if (obj._id) delete obj._id;
  return {
    ...obj,
    id,
    code: String(obj.code || '').toUpperCase(),
    discountType: obj.discountType || 'percentage',
    discountValue: Number(obj.discountValue ?? obj.discount ?? obj.value ?? obj.amount ?? 0),
    minOrderAmount: Number(obj.minOrderAmount || 0),
    maxDiscountAmount: Number(obj.maxDiscountAmount || 0),
    active: obj.active !== false,
    appliesTo: obj.appliesTo || 'all',
    categories: Array.isArray(obj.categories) ? obj.categories : (obj.categorySlug ? [obj.categorySlug] : []),
    subcategories: Array.isArray(obj.subcategories) ? obj.subcategories : [],
    childCategories: Array.isArray(obj.childCategories) ? obj.childCategories : [],
    brands: Array.isArray(obj.brands) ? obj.brands : [],
    sellers: Array.isArray(obj.sellers) ? obj.sellers : [],
    voucherType: obj.voucherType || 'general',
    paymentTypes: Array.isArray(obj.paymentTypes) ? obj.paymentTypes : [],
    paymentMethods: Array.isArray(obj.paymentMethods) ? obj.paymentMethods : [],
    banks: Array.isArray(obj.banks) ? obj.banks : [],
    cardTypes: Array.isArray(obj.cardTypes) ? obj.cardTypes : [],
    weekendOnly: obj.weekendOnly === true,
    products: Array.isArray(obj.products) ? obj.products : (obj.product ? [obj.product] : []),
  };
}

function isVisibleCustomerPromo(promo) {
  if (!promo || promo.active === false) return false;
  if (!promo.code) return false;
  if (!Number.isFinite(Number(promo.discountValue ?? promo.discount ?? promo.value ?? promo.amount)) || Number(promo.discountValue ?? promo.discount ?? promo.value ?? promo.amount) <= 0) return false;

  // Hide only promos that are definitely expired/used up. Do not hide future
  // startsAt promos from the coupon page because admin-created date/time values
  // can be timezone-shifted on Render and made valid promos look invisible.
  if (promo.expiresAt) {
    const expires = new Date(promo.expiresAt);
    if (!Number.isNaN(expires.getTime()) && expires < new Date()) return false;
  }
  if (promo.maxUses && Number(promo.usedCount || 0) >= Number(promo.maxUses)) return false;
  return true;
}

router.get('/', async (_req, res, next) => {
  try {
    // Customer voucher/coupon page: keep this intentionally broad so every
    // admin-created active promo is visible to customers. Target rules are
    // checked later during checkout validation.
    const promos = await PromoCode.find({ active: { $ne: false } })
      .populate(promoPopulate)
      .sort({ createdAt: -1 })
      .limit(200);

    const visible = promos.map(normalizePublicPromo).filter(isVisibleCustomerPromo);
    res.json({ promos: visible, coupons: visible, vouchers: visible, count: visible.length });
  } catch (error) {
    next(error);
  }
});

router.post('/validate', async (req, res, next) => {
  try {
    const code = String(req.body?.code || '').trim().toUpperCase();
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!code) return res.status(400).json({ message: 'Promo code is required' });
    if (!items.length) return res.status(400).json({ message: 'Add products before applying promo' });

    const escapedCode = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const promo = await PromoCode.findOne({
      code: { $regex: `^${escapedCode}$`, $options: 'i' },
      active: { $ne: false },
    }).populate(promoPopulate);

    if (!promo) {
      return res.status(404).json({ message: 'Promo code was not found. Please check the code spelling.' });
    }
    if (!isPromoActive(promo)) {
      return res.status(400).json({ message: 'Promo code is expired or usage limit is finished.' });
    }

    const usageCheck = promoMatchesUsageConditions(promo, {
      paymentMethod: req.body?.payment_method || req.body?.paymentMethod,
      paymentType: req.body?.payment_type || req.body?.paymentType,
      bankName: req.body?.bank_name || req.body?.bankName,
      cardType: req.body?.card_type || req.body?.cardType,
    });
    if (!usageCheck.ok) return res.status(400).json({ message: usageCheck.message });

    const productIds = items.map((item) => String(item.product_id || item.productId || item.product?.id || item.product?._id || '')).filter(Boolean);
    const products = await Product.find({ _id: { $in: productIds } }).populate('seller', 'name shopName shopLogo status');
    const productById = new Map(products.map((product) => [product._id.toString(), product]));
    const hydratedItems = items.map((item) => {
      const id = String(item.product_id || item.productId || item.product?.id || item.product?._id || '');
      return { ...item, product: productById.get(id) || item.product || item.product_snapshot };
    });
    const orderSubtotal = hydratedItems.reduce((sum, item) => sum + Number(item.quantity || 1) * Number(item.unit_price ?? item.product?.price ?? item.product_snapshot?.price ?? 0), 0);
    if (orderSubtotal < Number(promo.minOrderAmount || 0)) {
      return res.status(400).json({ message: `Minimum order amount is ৳${Number(promo.minOrderAmount || 0).toLocaleString()}` });
    }
    const { discount, eligibleSubtotal, eligibleItems } = calculatePromoDiscount(promo, hydratedItems);
    if (discount <= 0 || eligibleItems.length === 0) {
      return res.status(400).json({ message: 'This promo does not apply to the selected products' });
    }
    res.json({ promo: normalizePublicPromo(promo), discount, eligibleSubtotal, eligibleItemCount: eligibleItems.length });
  } catch (error) {
    next(error);
  }
});

router.get('/product/:id', async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate('seller', 'name shopName shopLogo status');
    if (!product) return res.status(404).json({ message: 'Product not found' });
    const promos = await PromoCode.find({ active: { $ne: false } }).populate(promoPopulate).sort({ createdAt: -1 }).limit(200);
    const visible = promos
      .filter((promo) => isPromoActive(promo) && promoMatchesProduct(promo, product))
      .map(normalizePublicPromo);
    res.json({ promos: visible, coupons: visible, vouchers: visible });
  } catch (error) {
    next(error);
  }
});

export default router;
