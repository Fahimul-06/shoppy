import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Seller from '../models/Seller.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();
const dir = path.join(process.cwd(), 'server', 'uploads');
fs.mkdirSync(dir, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype?.startsWith('image/')) return cb(new Error('Only image files are allowed'));
    cb(null, true);
  },
});

async function requireLoggedInUploader(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Login required to upload images' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');

    if (decoded.role === 'admin' || decoded.role === 'user' || decoded.role === 'customer') {
      const user = await User.findById(decoded.id);
      if (!user) return res.status(403).json({ message: 'User not found' });
      if (decoded.role === 'admin' && user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
      req.user = user;
      return next();
    }

    if (decoded.role === 'seller') {
      const seller = await Seller.findById(decoded.id);
      if (!seller) return res.status(403).json({ message: 'Seller access required' });
      req.seller = seller;
      return next();
    }

    return res.status(403).json({ message: 'Upload access denied' });
  } catch (error) {
    return res.status(401).json({ message: 'Invalid session. Please login again.' });
  }
}

function safeExt(file) {
  const fromName = path.extname(file.originalname || '').toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(fromName)) return fromName;
  if (file.mimetype === 'image/png') return '.png';
  if (file.mimetype === 'image/webp') return '.webp';
  if (file.mimetype === 'image/gif') return '.gif';
  return '.jpg';
}

router.post('/', requireLoggedInUploader, upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt(req.file)}`;
  const filepath = path.join(dir, filename);
  await fs.promises.writeFile(filepath, req.file.buffer);
  const publicPath = `/uploads/${filename}`;
  const origin = `${req.protocol}://${req.get('host')}`;
  res.json({ url: `${origin}${publicPath}`, path: publicPath });
}));

router.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'Image size must be less than 15 MB. Please choose a smaller image.' });
  }
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: err.message || 'Image upload failed' });
  }
  return res.status(400).json({ message: err.message || 'Image upload failed' });
});

export default router;
