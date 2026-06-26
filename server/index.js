import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { connectDB } from './models/index.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import categoryRoutes from './routes/categories.js';
import heroRoutes from './routes/heroSlides.js';
import orderRoutes from './routes/orders.js';
import adminRoutes from './routes/admin.js';
import sellerRoutes from './routes/seller.js';
import wishlistRoutes from './routes/wishlist.js';
import uploadRoutes from './routes/uploads.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CLIENT_URL?.split(',') || true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/hero-slides', heroRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/seller', sellerRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/uploads', uploadRoutes);

const possibleClientDistPaths = [
  path.join(process.cwd(), 'dist'),
  path.join(__dirname, '..', 'dist'),
  path.join(__dirname, '..', '..', 'dist'),
];

const clientDist = possibleClientDistPaths.find((distPath) =>
  fs.existsSync(path.join(distPath, 'index.html'))
);

if (clientDist) {
  console.log('Serving frontend from:', clientDist);
  app.use(express.static(clientDist));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
} else {
  console.warn('Frontend build not found. Checked:', possibleClientDistPaths);

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.status(500).send('Frontend build not found. Run npm run build before starting the server.');
  });
}

connectDB().then(() => {
  app.listen(PORT, () => console.log(`API running on port ${PORT}`));
}).catch((err) => {
  console.error('MongoDB connection failed:', err.message);
  process.exit(1);
});
