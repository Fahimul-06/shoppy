import express from 'express';
import PromoCode from '../models/PromoCode.js';
import Product from '../models/Product.js';
import { calculatePromoDiscount, isPromoActive, promoMatchesProduct } from '../utils/promo.js';

const router = express.Router();
const promoPopulate = [
  { path: 'sellers', select: 'name shopName shopLogo status' },
  { path: 'products', select: 'name image price category subcategory childCategory brand seller' },
];

router.get('/', async (_req, res) => {
  // Customer voucher/coupon page: show every active, currently valid promo,
  // including targeted category/brand/seller/product promos. Keep the Mongo
  // query broad and use the shared validator so older promo records with
  // missing date fields do not disappear from the customer page.
  const promos = await PromoCode.find({ active: { $ne: false } })
    .populate(promoPopulate)
    .sort({ createdAt: -1 });
  res.json({ promos: promos.filter((promo) => isPromoActive(promo)) });
});

router.post('/validate', async (req, res) => {
  const code = String(req.body?.code || '').trim().toUpperCase();
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (!code) return res.status(400).json({ message: 'Promo code is required' });
  if (!items.length) return res.status(400).json({ message: 'Add products before applying promo' });

  const promo = await PromoCode.findOne({ code }).populate(promoPopulate);
  if (!promo || !isPromoActive(promo)) return res.status(404).json({ message: 'Promo code is invalid or expired' });

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
  res.json({ promo, discount, eligibleSubtotal, eligibleItemCount: eligibleItems.length });
});

router.get('/product/:id', async (req, res) => {
  const product = await Product.findById(req.params.id).populate('seller', 'name shopName shopLogo status');
  if (!product) return res.status(404).json({ message: 'Product not found' });
  const promos = await PromoCode.find({ active: { $ne: false } }).populate(promoPopulate).sort({ createdAt: -1 });
  res.json({ promos: promos.filter((promo) => isPromoActive(promo) && promoMatchesProduct(promo, product)) });
});

export default router;
