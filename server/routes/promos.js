import express from 'express';
import PromoCode from '../models/PromoCode.js';
const router = express.Router();
router.get('/', async (_req, res) => {
  const now = new Date();
  const promos = await PromoCode.find({ active: { $ne: false }, $or: [{ expiresAt: null }, { expiresAt: { $exists: false } }, { expiresAt: { $gt: now } }] }).sort({ createdAt: -1 });
  res.json({ promos });
});
export default router;
