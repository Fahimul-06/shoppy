import express from 'express';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Seller from '../models/Seller.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { uploadImageBuffer } from '../utils/cloudinary.js';

const router = express.Router();

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

router.post('/', requireLoggedInUploader, upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  const folder = String(req.body?.folder || process.env.CLOUDINARY_UPLOAD_FOLDER || 'shoppy').replace(/[^a-zA-Z0-9_/-]+/g, '-').replace(/^\/+|\/+$/g, '') || 'shoppy';
  const uploaded = await uploadImageBuffer(req.file, { folder });

  res.json(uploaded);
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
