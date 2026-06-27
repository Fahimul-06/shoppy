import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Seller from '../models/Seller.js';

const router = express.Router();
const dir = path.join(process.cwd(), 'server', 'uploads');
fs.mkdirSync(dir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, dir),
  filename: (_req, file, cb) => {
    const safeExt = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
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

    if (decoded.role === 'admin') {
      const user = await User.findById(decoded.id);
      if (!user || user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
      req.user = user;
      return next();
    }

    if (decoded.role === 'user') {
      const user = await User.findById(decoded.id);
      if (!user || user.role !== 'user') return res.status(403).json({ message: 'Customer access required' });
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
  } catch {
    return res.status(401).json({ message: 'Invalid session' });
  }
}

router.post('/', requireLoggedInUploader, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  const publicPath = `/uploads/${req.file.filename}`;
  const origin = `${req.protocol}://${req.get('host')}`;
  res.json({ url: `${origin}${publicPath}`, path: publicPath });
});

router.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'Image size must be less than 5 MB' });
  }
  return res.status(400).json({ message: err.message || 'Image upload failed' });
});

export default router;
