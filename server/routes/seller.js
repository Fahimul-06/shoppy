import express from 'express';
import bcrypt from 'bcryptjs';
import Seller from '../models/Seller.js';
import Product from '../models/Product.js';
import { requireSeller, signToken } from '../middleware/auth.js';
const router = express.Router();
const publicSeller = (s) => ({ id: s.id, name: s.name, email: s.email, phone: s.phone, shopName: s.shopName, shopAddress: s.shopAddress, status: s.status });
router.post('/register', async (req, res) => {
  const { name, email, phone, password, shopName, shopAddress, businessType, nidNumber, tinNumber, bankName, bankAccount, documents } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
  const exists = await Seller.findOne({ email: String(email).toLowerCase() });
  if (exists) return res.status(409).json({ message: 'Seller email already registered' });
  const seller = await Seller.create({ name, email, phone, passwordHash: await bcrypt.hash(password, 10), shopName, shopAddress, businessType, nidNumber, tinNumber, bankName, bankAccount, documents: documents || [] });
  res.status(201).json({ seller: publicSeller(seller) });
});
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const seller = await Seller.findOne({ email: String(email || '').toLowerCase() });
  if (!seller || !(await bcrypt.compare(password || '', seller.passwordHash))) return res.status(401).json({ message: 'Invalid seller credentials' });
  if (seller.status === 'blocked') return res.status(403).json({ message: 'Your seller account is blocked' });
  res.json({ token: signToken({ id: seller.id, role: 'seller' }), seller: publicSeller(seller) });
});
router.get('/me', requireSeller, (req, res) => res.json({ seller: publicSeller(req.seller) }));
router.get('/products', requireSeller, async (req, res) => res.json({ products: await Product.find({ seller: req.seller.id }).sort({ createdAt: -1 }) }));
router.post('/products', requireSeller, async (req, res) => res.status(201).json({ product: await Product.create({ ...req.body, seller: req.seller.id }) }));
router.put('/products/:id', requireSeller, async (req, res) => {
  const product = await Product.findOneAndUpdate({ _id: req.params.id, seller: req.seller.id }, req.body, { new: true });
  res.json({ product });
});
router.delete('/products/:id', requireSeller, async (req, res) => { await Product.findOneAndDelete({ _id: req.params.id, seller: req.seller.id }); res.json({ ok: true }); });
export default router;
