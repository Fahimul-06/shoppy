import express from 'express';
import HeroSlide from '../models/HeroSlide.js';
import Product from '../models/Product.js';
import PromoCode from '../models/PromoCode.js';
const router = express.Router();

const allowedPlacements = ['hero', 'header', 'event', 'voucher', 'campaign'];

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getId(value) {
  return value?._id?.toString?.() || value?.id?.toString?.() || value?.toString?.() || '';
}

function activePromoFilter() {
  const now = new Date();
  return {
    active: { $ne: false },
    $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gte: now } }],
  };
}

async function productsFromMatchingPromos(banner) {
  const type = String(banner.relatedType || 'all');
  const value = String(banner.relatedValue || '').trim();
  if (!['bank_card', 'payment_type', 'weekday'].includes(type)) return [];

  const filter = activePromoFilter();
  if (type === 'payment_type' && value) {
    filter.$and = [{ $or: [{ voucherType: 'payment_type' }, { paymentTypes: { $regex: new RegExp(`^${escapeRegExp(value)}$`, 'i') } }] }];
  }
  if (type === 'bank_card' && value) {
    const rx = new RegExp(`^${escapeRegExp(value)}$`, 'i');
    filter.$and = [{ $or: [{ voucherType: 'bank_card' }, { banks: { $regex: rx } }, { cardTypes: { $regex: rx } }] }];
  }
  if (type === 'weekday') {
    filter.$and = [{ $or: [{ voucherType: 'weekend_deal' }, { weekendOnly: true }] }];
  }

  const promos = await PromoCode.find(filter).populate('products sellers').limit(40);
  const productIds = new Set();
  const sellerIds = new Set();
  const brands = new Set();
  const categories = new Set();
  const subcategories = new Set();
  const childCategories = new Set();
  let includesAll = false;

  for (const promo of promos) {
    if (promo.appliesTo === 'all') includesAll = true;
    for (const item of promo.products || []) productIds.add(getId(item));
    if (promo.product) productIds.add(getId(promo.product));
    for (const item of promo.sellers || []) sellerIds.add(getId(item));
    for (const item of promo.brands || []) if (item) brands.add(String(item));
    for (const item of promo.categories || []) if (item) categories.add(String(item));
    for (const item of promo.subcategories || []) if (item) subcategories.add(String(item));
    for (const item of promo.childCategories || []) if (item) childCategories.add(String(item));
    if (promo.categorySlug) categories.add(String(promo.categorySlug));
  }

  const or = [];
  if (productIds.size) or.push({ _id: { $in: [...productIds] } });
  if (sellerIds.size) or.push({ seller: { $in: [...sellerIds] } });
  if (brands.size) or.push({ brand: { $in: [...brands].map((x) => new RegExp(`^${escapeRegExp(x)}$`, 'i')) } });
  if (categories.size) or.push({ category: { $in: [...categories].map((x) => new RegExp(`^${escapeRegExp(x)}$`, 'i')) } });
  if (subcategories.size) or.push({ subcategory: { $in: [...subcategories].map((x) => new RegExp(`^${escapeRegExp(x)}$`, 'i')) } });
  if (childCategories.size) or.push({ childCategory: { $in: [...childCategories].map((x) => new RegExp(`^${escapeRegExp(x)}$`, 'i')) } });

  if (includesAll && !or.length) {
    return Product.find({ active: { $ne: false } }).populate('seller', 'name shopName shopLogo shopBanner shopAddress status').sort({ createdAt: -1 }).limit(80);
  }
  if (!or.length) return [];
  return Product.find({ active: { $ne: false }, $or: or }).populate('seller', 'name shopName shopLogo shopBanner shopAddress status').sort({ createdAt: -1 }).limit(80);
}


function buildBannerProductFilter(banner) {
  const filter = { active: { $ne: false } };
  const type = String(banner.relatedType || 'all');
  const value = String(banner.relatedValue || '').trim();

  if (type === 'category' && value) filter.category = new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  if (type === 'brand' && value) filter.brand = new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  if ((type === 'seller' || type === 'shop') && value) filter.seller = value;
  if (type === 'product' && Array.isArray(banner.products) && banner.products.length) filter._id = { $in: banner.products };
  if (type === 'search' && value) {
    const rx = new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [
      { name: rx },
      { brand: rx },
      { category: rx },
      { subcategory: rx },
      { childCategory: rx },
      { description: rx },
    ];
  }
  return filter;
}

router.get('/', async (req, res) => {
  const placement = allowedPlacements.includes(String(req.query.placement || '')) ? String(req.query.placement) : null;
  const placements = String(req.query.placements || '')
    .split(',')
    .map((item) => item.trim())
    .filter((item) => allowedPlacements.includes(item));

  const filter = { active: true };
  if (placements.length) filter.placement = { $in: placements };
  else if (placement) filter.placement = placement;

  const slides = await HeroSlide.find(filter).sort({ sortOrder: 1, createdAt: -1 });
  res.json({ heroSlides: slides, banners: slides, headerBanners: slides });
});

router.get('/:id/products', async (req, res) => {
  const banner = await HeroSlide.findOne({ _id: req.params.id, active: true }).populate('products');
  if (!banner) return res.status(404).json({ message: 'Display photo not found' });

  let products = [];
  if (banner.relatedType === 'product' && Array.isArray(banner.products) && banner.products.length) {
    products = banner.products.filter((product) => product && product.active !== false);
  } else if (['bank_card', 'payment_type', 'weekday'].includes(String(banner.relatedType || ''))) {
    products = await productsFromMatchingPromos(banner);
  } else {
    const filter = buildBannerProductFilter(banner);
    products = await Product.find(filter)
      .populate('seller', 'name shopName shopLogo shopBanner shopAddress status')
      .sort({ createdAt: -1 })
      .limit(80);
  }

  // If admin did not set a product rule, use title/subtitle as a light search fallback before showing latest products.
  if (!products.length && ['all', '', null, undefined].includes(banner.relatedType)) {
    const keyword = [banner.title, banner.subtitle].filter(Boolean).join(' ').trim();
    if (keyword) {
      const rx = new RegExp(keyword.split(/\s+/).filter(Boolean).slice(0, 4).join('|'), 'i');
      products = await Product.find({ active: { $ne: false }, $or: [{ name: rx }, { category: rx }, { brand: rx }, { description: rx }] })
        .populate('seller', 'name shopName shopLogo shopBanner shopAddress status')
        .sort({ createdAt: -1 })
        .limit(80);
    }
  }

  if (!products.length) {
    products = await Product.find({ active: { $ne: false } })
      .populate('seller', 'name shopName shopLogo shopBanner shopAddress status')
      .sort({ createdAt: -1 })
      .limit(40);
  }

  res.json({ banner, products });
});

export default router;
