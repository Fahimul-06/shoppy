import express from 'express';
import HeroSlide from '../models/HeroSlide.js';
import PromoCode from '../models/PromoCode.js';
import Product from '../models/Product.js';
const router = express.Router();

const productPopulate = 'name image price originalPrice category subcategory childCategory brand rating reviewCount seller';
const sellerPopulate = { path: 'seller', select: 'name shopName shopLogo shopBanner shopAddress status' };

function regexFrom(value) {
  const safe = String(value || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return safe ? new RegExp(`^${safe}$`, 'i') : null;
}

function buildRelatedFilter(source = {}) {
  const filter = { active: { $ne: false } };
  const and = [];
  const products = Array.isArray(source.products) ? source.products.map((p) => p?._id || p?.id || p).filter(Boolean) : [];
  if (products.length) filter._id = { $in: products };
  const categoryRegexes = (source.categories || []).map(regexFrom).filter(Boolean);
  const brandRegexes = (source.brands || []).map(regexFrom).filter(Boolean);
  if (categoryRegexes.length) and.push({ $or: categoryRegexes.flatMap((rx) => [{ category: rx }, { subcategory: rx }, { childCategory: rx }]) });
  if (brandRegexes.length) and.push({ brand: { $in: brandRegexes } });
  if (and.length) filter.$and = and;
  return filter;
}

async function findRelatedProductsFromBanner(banner, limit = 60) {
  if (!banner) return [];
  let source = banner;
  if ((!banner.products?.length && !banner.categories?.length && !banner.brands?.length) && banner.promo) {
    source = banner.promo;
  }
  const filter = buildRelatedFilter(source);
  return Product.find(filter).populate(sellerPopulate).sort({ createdAt: -1 }).limit(limit);
}

router.get('/', async (req, res) => {
  const placement = ['hero', 'header'].includes(String(req.query.placement || '')) ? String(req.query.placement) : null;
  const filter = { active: true };
  if (placement) filter.placement = placement;
  const slides = await HeroSlide.find(filter)
    .populate('products', productPopulate)
    .populate('promo')
    .sort({ sortOrder: 1, createdAt: -1 });

  let promoBanners = [];
  if (placement === 'header' || !placement) {
    const now = new Date();
    const promos = await PromoCode.find({
      active: { $ne: false },
      image: { $exists: true, $ne: '' },
      $or: [{ expiresAt: null }, { expiresAt: { $exists: false } }, { expiresAt: { $gte: now } }],
    })
      .populate('products', productPopulate)
      .sort({ createdAt: -1 })
      .limit(12);
    promoBanners = promos.map((promo) => ({
      id: `promo-${promo.id || promo._id}`,
      sourceId: promo.id || promo._id?.toString?.(),
      image: promo.image,
      title: promo.description || `Voucher ${promo.code}`,
      subtitle: `${promo.code} • ${promo.discountType === 'percentage' ? `${promo.discountValue}% OFF` : `৳${promo.discountValue} OFF`}`,
      link: `/promotion/promo/${promo.id || promo._id}`,
      placement: 'header',
      bannerType: 'voucher',
      promo,
      products: promo.products || [],
      active: true,
    }));
  }

  const all = placement === 'header' ? [...slides, ...promoBanners] : slides;
  res.json({ heroSlides: all, banners: all, headerBanners: all });
});

router.get('/:kind/:id/products', async (req, res) => {
  const kind = String(req.params.kind || '').toLowerCase();
  const id = String(req.params.id || '').replace(/^promo-/, '');
  const limit = Math.min(Number(req.query.limit || 60), 100);

  if (kind === 'promo') {
    const promo = await PromoCode.findById(id).populate('products', productPopulate).populate('sellers');
    if (!promo) return res.status(404).json({ message: 'Voucher/coupon not found' });
    const products = await Product.find(buildRelatedFilter(promo)).populate(sellerPopulate).sort({ createdAt: -1 }).limit(limit);
    return res.json({ banner: { id: promo.id, title: promo.description || `Voucher ${promo.code}`, subtitle: promo.code, image: promo.image, bannerType: 'voucher', promo }, products });
  }

  const banner = await HeroSlide.findById(id).populate('products', productPopulate).populate('promo');
  if (!banner || banner.active === false) return res.status(404).json({ message: 'Promotion not found' });
  const products = await findRelatedProductsFromBanner(banner, limit);
  res.json({ banner, products });
});

export default router;
