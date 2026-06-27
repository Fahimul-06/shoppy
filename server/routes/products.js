import express from 'express';
import Product from '../models/Product.js';
const router = express.Router();
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

router.get('/', async (req, res) => {
  const { category, badge, search, includeInactive } = req.query;
  // Treat missing `active` as public because older seller-created products may not have this field.
  const filter = includeInactive === 'true' ? {} : { active: { $ne: false } };
  if (category) filter.category = category;
  if (badge) filter.badge = badge;
  if (search) filter.$or = [
    { name: new RegExp(esc(search), 'i') },
    { brand: new RegExp(esc(search), 'i') },
    { description: new RegExp(esc(search), 'i') },
  ];
  const products = await Product.find(filter).populate('seller', 'name shopName shopLogo shopAddress status').sort({ createdAt: -1 });
  res.json({ products });
});


router.get('/:id/related', async (req, res) => {
  const id = req.params.id;
  const limit = Math.min(Number(req.query.limit || 10), 20);
  const product = id.match(/^[a-f\d]{24}$/i)
    ? await Product.findById(id)
    : await Product.findOne({ legacyId: id });

  if (!product) return res.json({ products: [] });

  const currentSellerId = product.seller ? String(product.seller) : '';
  const candidates = await Product.find({
    active: { $ne: false },
    _id: { $ne: product._id },
  })
    .populate('seller', 'name shopName shopLogo shopAddress status')
    .sort({ createdAt: -1 })
    .limit(200);

  const same = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
  const scored = candidates
    .map((candidate) => {
      const candidateSellerId = candidate.seller?._id ? String(candidate.seller._id) : String(candidate.seller || '');
      let score = 0;
      if (same(candidate.childCategory, product.childCategory)) score += 50;
      if (same(candidate.subcategory, product.subcategory)) score += 40;
      if (same(candidate.category, product.category)) score += 30;
      if (currentSellerId && candidateSellerId === currentSellerId) score += 20;
      if (same(candidate.brand, product.brand)) score += 10;
      return { candidate, score };
    })
    .sort((a, b) => b.score - a.score || new Date(b.candidate.createdAt || 0) - new Date(a.candidate.createdAt || 0));

  res.json({ products: scored.slice(0, limit).map((item) => item.candidate) });
});

router.get('/:id', async (req, res) => {
  const id = req.params.id;
  const product = id.match(/^[a-f\d]{24}$/i)
    ? await Product.findById(id).populate('seller', 'name shopName shopLogo shopAddress status')
    : await Product.findOne({ legacyId: id }).populate('seller', 'name shopName shopLogo shopAddress status');
  res.json({ product });
});
export default router;
