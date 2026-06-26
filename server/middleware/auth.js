import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Seller from '../models/Seller.js';

export function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' });
}

export async function requireUser(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Authentication required' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: 'Invalid session' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid session' });
  }
}

export async function requireAdmin(req, res, next) {
  await requireUser(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    next();
  });
}

export async function requireSeller(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Seller authentication required' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    if (decoded.role !== 'seller') return res.status(403).json({ message: 'Seller access required' });
    const seller = await Seller.findById(decoded.id);
    if (!seller) return res.status(401).json({ message: 'Invalid seller session' });
    req.seller = seller;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid seller session' });
  }
}
