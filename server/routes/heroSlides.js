import express from 'express';
import HeroSlide from '../models/HeroSlide.js';
import Product from '../models/Product.js';
const router = express.Router();

const allowedPlacements = ['hero', 'header', 'event', 'voucher', 'campaign'];

function buildBannerProductFilter(banner) {
  const filter = { active: { $ne: false } };
  const type = String(banner.relatedType || 'all');
  const value = String(banner.relatedValue || '').trim();

  if (type === 'category' && value) filter.category = new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  if (type === 'brand' && value) filter.brand = new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  if (type === 'seller' && value) filter.seller = value;
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
