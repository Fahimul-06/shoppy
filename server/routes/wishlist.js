import express from 'express';
import Wishlist from '../models/Wishlist.js';
import { requireUser } from '../middleware/auth.js';
const router = express.Router();
router.get('/', requireUser, async (req, res) => {
  const rows = await Wishlist.find({ user: req.user.id }).populate('product').sort({ createdAt: -1 });
  res.json({ products: rows.map((r) => r.product).filter(Boolean) });
});

router.get('/ids', requireUser, async (req, res) => {
  const rows = await Wishlist.find({ user: req.user.id }).select('product');
  res.json({ productIds: rows.map((r) => String(r.product)) });
});

router.get('/:productId/status', requireUser, async (req, res) => {
  const existing = await Wishlist.findOne({ user: req.user.id, product: req.params.productId });
  res.json({ wishlisted: Boolean(existing) });
});
router.post('/toggle', requireUser, async (req, res) => {
  const productId = req.body.productId;
  const existing = await Wishlist.findOne({ user: req.user.id, product: productId });
  if (existing) { await existing.deleteOne(); return res.json({ wishlisted: false }); }
  await Wishlist.create({ user: req.user.id, product: productId });
  res.json({ wishlisted: true });
});
export default router;
