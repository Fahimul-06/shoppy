import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { requireUser, signToken } from '../middleware/auth.js';
const router = express.Router();
const publicUser = (u) => ({ id: u.id, fullName: u.fullName, email: u.email, phone: u.phone, role: u.role });

router.post('/register', async (req, res) => {
  const { name, fullName, email, phone, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) return res.status(409).json({ message: 'Email already registered' });
  const user = await User.create({ fullName: fullName || name, email, phone, passwordHash: await bcrypt.hash(password, 10), role: 'user' });
  const token = signToken({ id: user.id, role: user.role });
  res.status(201).json({ token, user: publicUser(user) });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: String(email || '').toLowerCase() });
  if (!user || !(await bcrypt.compare(password || '', user.passwordHash))) return res.status(401).json({ message: 'Invalid email or password' });
  const token = signToken({ id: user.id, role: user.role });
  res.json({ token, user: publicUser(user) });
});

router.get('/me', requireUser, (req, res) => res.json({ user: publicUser(req.user) }));
router.put('/profile', requireUser, async (req, res) => {
  const { fullName, name, phone } = req.body;
  req.user.fullName = fullName ?? name ?? req.user.fullName;
  req.user.phone = phone ?? req.user.phone;
  await req.user.save();
  res.json({ user: publicUser(req.user) });
});
export default router;
