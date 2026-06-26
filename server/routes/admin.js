import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Seller from '../models/Seller.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import PromoCode from '../models/PromoCode.js';
import { requireAdmin, signToken } from '../middleware/auth.js';
const router = express.Router();
const adminUser = (u) => ({ id: u.id, fullName: u.fullName, email: u.email, phone: u.phone, role: u.role });

async function ensureDefaultAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@gmail.com';
  const password = process.env.ADMIN_PASSWORD || 'Qwertyuiop09';
  let admin = await User.findOne({ email: email.toLowerCase() });
  if (!admin) admin = await User.create({ fullName: 'Admin', email, passwordHash: await bcrypt.hash(password, 10), role: 'admin' });
  if (admin.role !== 'admin') { admin.role = 'admin'; await admin.save(); }
  return admin;
}

router.post('/login', async (req, res) => {
  await ensureDefaultAdmin();
  const { email, password } = req.body;
  const user = await User.findOne({ email: String(email || '').toLowerCase(), role: 'admin' });
  if (!user || !(await bcrypt.compare(password || '', user.passwordHash))) return res.status(401).json({ message: 'Invalid admin credentials' });
  res.json({ token: signToken({ id: user.id, role: 'admin' }), user: adminUser(user) });
});
router.get('/me', requireAdmin, (req, res) => res.json({ user: adminUser(req.user) }));
router.get('/stats', requireAdmin, async (_req, res) => {
  const [totalSellers, pendingSellers, totalProducts, totalOrders, activePromos, paidOrders] = await Promise.all([
    Seller.countDocuments(), Seller.countDocuments({ status: 'pending' }), Product.countDocuments(), Order.countDocuments(), PromoCode.countDocuments({ active: true }), Order.find({ paymentStatus: 'paid' }),
  ]);
  res.json({ stats: { totalSellers, pendingSellers, totalProducts, totalOrders, activePromos, revenue: paidOrders.reduce((s, o) => s + Number(o.totalAmount || 0), 0) } });
});
router.get('/sellers', requireAdmin, async (_req, res) => res.json({ sellers: await Seller.find().sort({ createdAt: -1 }) }));
router.patch('/sellers/:id/status', requireAdmin, async (req, res) => {
  const seller = await Seller.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
  res.json({ seller });
});
router.get('/products', requireAdmin, async (_req, res) => res.json({ products: await Product.find().sort({ createdAt: -1 }).populate('seller') }));
router.post('/products', requireAdmin, async (req, res) => res.status(201).json({ product: await Product.create(req.body) }));
router.put('/products/:id', requireAdmin, async (req, res) => res.json({ product: await Product.findByIdAndUpdate(req.params.id, req.body, { new: true }) }));
router.delete('/products/:id', requireAdmin, async (req, res) => { await Product.findByIdAndDelete(req.params.id); res.json({ ok: true }); });
router.get('/orders', requireAdmin, async (_req, res) => res.json({ orders: await Order.find().populate('user').sort({ createdAt: -1 }) }));
router.patch('/orders/:id', requireAdmin, async (req, res) => res.json({ order: await Order.findByIdAndUpdate(req.params.id, req.body, { new: true }) }));
router.get('/promos', requireAdmin, async (_req, res) => res.json({ promos: await PromoCode.find().sort({ createdAt: -1 }) }));
router.post('/promos', requireAdmin, async (req, res) => res.status(201).json({ promo: await PromoCode.create(req.body) }));
router.put('/promos/:id', requireAdmin, async (req, res) => res.json({ promo: await PromoCode.findByIdAndUpdate(req.params.id, req.body, { new: true }) }));
router.delete('/promos/:id', requireAdmin, async (req, res) => { await PromoCode.findByIdAndDelete(req.params.id); res.json({ ok: true }); });
router.put('/settings', requireAdmin, async (req, res) => {
  const { fullName, email, password } = req.body;
  if (fullName !== undefined) req.user.fullName = fullName;
  if (email) req.user.email = email;
  if (password) req.user.passwordHash = await bcrypt.hash(password, 10);
  await req.user.save();
  res.json({ user: adminUser(req.user) });
});
export default router;
