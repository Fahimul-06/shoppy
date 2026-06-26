import express from 'express';
import Product from '../models/Product.js';
const router = express.Router();
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

router.get('/', async (req, res) => {
  const { category, badge, search, includeInactive } = req.query;
  const filter = includeInactive === 'true' ? {} : { active: true };
  if (category) filter.category = category;
  if (badge) filter.badge = badge;
  if (search) filter.$or = [
    { name: new RegExp(esc(search), 'i') },
    { brand: new RegExp(esc(search), 'i') },
    { description: new RegExp(esc(search), 'i') },
  ];
  const products = await Product.find(filter).sort({ createdAt: -1 });
  res.json({ products });
});

router.get('/:id', async (req, res) => {
  const id = req.params.id;
  const product = id.match(/^[a-f\d]{24}$/i)
    ? await Product.findById(id)
    : await Product.findOne({ legacyId: id });
  res.json({ product });
});
export default router;
