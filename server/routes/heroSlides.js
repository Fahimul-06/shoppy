import express from 'express';
import mongoose from 'mongoose';
import HeroSlide from '../models/HeroSlide.js';
import Product from '../models/Product.js';

const router = express.Router();
const allowedPlacements = ['hero', 'header', 'event', 'voucher', 'campaign'];
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function parsePlacements(value) {
  const parts = String(value || '')
    .split(',')
    .map((x) => x.trim())
    .filter((x) => allowedPlacements.includes(x));
  return [...new Set(parts)];
}

async function relatedProductQuery(slide, limit = 48) {
  const base = { active: { $ne: false } };
  const targetType = slide.targetType || 'all';
  const targetValue = String(slide.targetValue || '').trim();

  if (targetType === 'products' && Array.isArray(slide.productIds) && slide.productIds.length) {
    return Product.find({ ...base, _id: { $in: slide.productIds } })
      .populate('seller', 'name shopName shopLogo shopBanner shopAddress status')
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  if (targetType === 'category' && targetValue) {
    const rx = new RegExp(esc(targetValue).replace(/\s+/g, '[\\s-]+'), 'i');
    return Product.find({ ...base, $or: [{ category: rx }, { subcategory: rx }, { childCategory: rx }] })
      .populate('seller', 'name shopName shopLogo shopBanner shopAddress status')
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  if (targetType === 'brand' && targetValue) {
    return Product.find({ ...base, brand: new RegExp(`^${esc(targetValue)}$`, 'i') })
      .populate('seller', 'name shopName shopLogo shopBanner shopAddress status')
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  if (targetType === 'seller' && targetValue && mongoose.Types.ObjectId.isValid(targetValue)) {
    return Product.find({ ...base, seller: targetValue })
      .populate('seller', 'name shopName shopLogo shopBanner shopAddress status')
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  return Product.find(base)
    .populate('seller', 'name shopName shopLogo shopBanner shopAddress status')
    .sort({ createdAt: -1 })
    .limit(Math.min(limit, 24));
}

router.get('/', async (req, res) => {
  const placements = parsePlacements(req.query.placement);
  const filter = { active: true };
  if (placements.length) filter.placement = { $in: placements };
  const slides = await HeroSlide.find(filter).sort({ sortOrder: 1, createdAt: -1 });
  res.json({ heroSlides: slides, banners: slides, headerBanners: slides });
});

router.get('/:id', async (req, res) => {
  const slide = await HeroSlide.findById(req.params.id).populate('productIds', 'name image images price originalPrice category subcategory childCategory brand rating reviewCount seller saleTags dailySaleDiscount flashSaleDiscount');
  if (!slide || slide.active === false) return res.status(404).json({ message: 'Display not found' });
  const products = await relatedProductQuery(slide, Math.min(Number(req.query.limit || 48), 96));
  res.json({ banner: slide, heroSlide: slide, products });
});

export default router;
