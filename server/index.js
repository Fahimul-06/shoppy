import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import { products as seedProducts, heroSlides as seedHeroSlides, categories as seedCategories } from './seedData.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-before-production';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const allowedOrigins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

const productSchema = new mongoose.Schema({
  legacyId: String,
  name: { type: String, required: true },
  price: { type: Number, required: true },
  originalPrice: Number,
  image: String,
  images: [String],
  category: { type: String, index: true },
  brand: String,
  rating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  badge: { type: String, enum: ['sale', 'new', 'hot', null], default: null },
  discount: Number,
  stock: { type: Number, default: 0 },
  description: String,
  features: [String],
  specifications: { type: Map, of: String },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  active: { type: Boolean, default: true },
}, { timestamps: true });

const categorySchema = new mongoose.Schema({
  legacyId: String,
  name: { type: String, required: true },
  image: String,
  slug: { type: String, required: true, unique: true },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

const heroSlideSchema = new mongoose.Schema({
  legacyId: String,
  image: String,
  title: String,
  subtitle: String,
  active: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

const userSchema = new mongoose.Schema({
  fullName: String,
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  phone: String,
  role: { type: String, enum: ['customer', 'seller', 'admin'], default: 'customer' },
  sellerStatus: { type: String, enum: ['none', 'pending', 'approved', 'rejected'], default: 'none' },
  shopName: String,
  businessType: String,
  nidNumber: String,
  tradeLicense: String,
  address: String,
  documentUrl: String,
}, { timestamps: true });

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
  productSnapshot: mongoose.Schema.Types.Mixed,
  quantity: Number,
  unitPrice: Number,
  totalPrice: Number,
}, { _id: true });

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, unique: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  customer: { name: String, email: String, phone: String },
  status: { type: String, default: 'pending' },
  paymentStatus: { type: String, default: 'pending' },
  subtotal: Number,
  discountAmount: { type: Number, default: 0 },
  deliveryFee: { type: Number, default: 0 },
  totalAmount: Number,
  paymentMethod: String,
  shippingAddress: mongoose.Schema.Types.Mixed,
  items: [orderItemSchema],
}, { timestamps: true });

const promoCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  description: String,
  discountType: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
  discountValue: { type: Number, required: true },
  minOrder: { type: Number, default: 0 },
  maxUses: Number,
  usedCount: { type: Number, default: 0 },
  appliesTo: { type: String, enum: ['all', 'product', 'category'], default: 'all' },
  productId: String,
  categorySlug: String,
  expiresAt: Date,
  active: { type: Boolean, default: true },
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);
const Category = mongoose.model('Category', categorySchema);
const HeroSlide = mongoose.model('HeroSlide', heroSlideSchema);
const User = mongoose.model('User', userSchema);
const Order = mongoose.model('Order', orderSchema);
const PromoCode = mongoose.model('PromoCode', promoCodeSchema);

function toProduct(doc) {
  if (!doc) return null;
  const p = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(p._id),
    legacyId: p.legacyId,
    name: p.name,
    price: p.price,
    originalPrice: p.originalPrice,
    image: p.image,
    images: p.images || [],
    category: p.category,
    brand: p.brand,
    rating: p.rating || 0,
    reviewCount: p.reviewCount || 0,
    badge: p.badge || undefined,
    discount: p.discount,
    stock: p.stock,
    description: p.description,
    features: p.features || [],
    specifications: p.specifications ? Object.fromEntries(p.specifications) : {},
    active: p.active,
    sellerId: p.sellerId ? String(p.sellerId) : null,
  };
}

function toCategory(doc) {
  const c = doc.toObject ? doc.toObject() : doc;
  return { id: String(c._id), legacyId: c.legacyId, name: c.name, image: c.image, slug: c.slug };
}

function toOrder(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(o._id),
    order_number: o.orderNumber,
    status: o.status,
    payment_status: o.paymentStatus,
    subtotal: o.subtotal || 0,
    discount_amount: o.discountAmount || 0,
    delivery_fee: o.deliveryFee || 0,
    total_amount: o.totalAmount || 0,
    payment_method: o.paymentMethod,
    shipping_address: o.shippingAddress,
    customer: o.customer,
    items: (o.items || []).map((item) => ({
      id: String(item._id),
      product_id: item.productId ? String(item.productId) : null,
      product_snapshot: item.productSnapshot,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.totalPrice,
    })),
    created_at: o.createdAt,
    updated_at: o.updatedAt,
  };
}

function signToken(user) {
  return jwt.sign({ id: String(user._id), role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}

async function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Not authenticated' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ message: 'Invalid user' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Forbidden' });
    next();
  };
}

async function seedDatabase() {
  if (await Product.countDocuments()) return;
  await Category.insertMany(seedCategories.map((c, i) => ({ legacyId: c.id, name: c.name, image: c.image, slug: c.slug, sortOrder: i })));
  await HeroSlide.insertMany(seedHeroSlides.map((h, i) => ({ legacyId: h.id, image: h.image, title: h.title, subtitle: h.subtitle, sortOrder: i, active: true })));
  await Product.insertMany(seedProducts.map((p) => ({ ...p, legacyId: p.id, active: true })));
  await PromoCode.create({ code: 'CARTUP10', description: '10% off demo coupon', discountType: 'percentage', discountValue: 10, minOrder: 0, appliesTo: 'all', active: true });
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await User.create({ email: adminEmail, passwordHash, fullName: 'Admin', role: 'admin' });
  }
}

app.get('/api/health', (_req, res) => res.json({ ok: true, database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' }));

app.post('/api/auth/register', async (req, res) => {
  try {
    const { fullName, email, password, phone, role = 'customer', shopName, businessType, nidNumber, tradeLicense, address, documentUrl } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
    const exists = await User.findOne({ email: String(email).toLowerCase() });
    if (exists) return res.status(409).json({ message: 'Email already exists' });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      fullName, email, passwordHash, phone,
      role: role === 'seller' ? 'seller' : 'customer',
      sellerStatus: role === 'seller' ? 'pending' : 'none',
      shopName, businessType, nidNumber, tradeLicense, address, documentUrl,
    });
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const user = await User.findOne({ email: String(email || '').toLowerCase() });
    if (!user || !(await bcrypt.compare(password || '', user.passwordHash))) return res.status(401).json({ message: 'Invalid email or password' });
    if (role && user.role !== role) return res.status(403).json({ message: `This account is not a ${role} account` });
    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get('/api/auth/me', auth, (req, res) => res.json({ user: publicUser(req.user) }));
app.patch('/api/auth/me', auth, async (req, res) => {
  const fields = ['fullName', 'phone', 'address'];
  for (const f of fields) if (f in req.body) req.user[f] = req.body[f];
  await req.user.save();
  res.json({ user: publicUser(req.user) });
});
app.patch('/api/auth/password', auth, async (req, res) => {
  if (!req.body.password || req.body.password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
  req.user.passwordHash = await bcrypt.hash(req.body.password, 10);
  await req.user.save();
  res.json({ ok: true });
});

function publicUser(user) {
  return {
    id: String(user._id), fullName: user.fullName, email: user.email, phone: user.phone,
    role: user.role, sellerStatus: user.sellerStatus, shopName: user.shopName,
    businessType: user.businessType, address: user.address, documentUrl: user.documentUrl,
    createdAt: user.createdAt,
  };
}

app.get('/api/products', async (req, res) => {
  const filter = { active: true };
  if (req.query.category && req.query.category !== 'all') filter.category = req.query.category;
  if (req.query.badge) filter.badge = req.query.badge;
  if (req.query.search) {
    const rx = new RegExp(String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { brand: rx }, { description: rx }];
  }
  const products = await Product.find(filter).sort(req.query.search ? { rating: -1 } : { createdAt: -1 }).limit(Number(req.query.limit) || 200);
  res.json(products.map(toProduct));
});

app.get('/api/products/:id', async (req, res) => {
  const id = req.params.id;
  const product = mongoose.Types.ObjectId.isValid(id)
    ? await Product.findOne({ _id: id, active: true })
    : await Product.findOne({ legacyId: id, active: true });
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json(toProduct(product));
});

app.get('/api/categories', async (_req, res) => {
  const categories = await Category.find({}).sort({ sortOrder: 1, createdAt: 1 });
  res.json(categories.map(toCategory));
});

app.get('/api/hero-slides', async (_req, res) => {
  const slides = await HeroSlide.find({ active: true }).sort({ sortOrder: 1 });
  res.json(slides.map((s) => ({ id: String(s._id), image: s.image, title: s.title, subtitle: s.subtitle })));
});

app.post('/api/orders', async (req, res) => {
  try {
    let user = null;
    const header = req.headers.authorization || '';
    if (header.startsWith('Bearer ')) {
      try { user = await User.findById(jwt.verify(header.slice(7), JWT_SECRET).id); } catch {}
    }
    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;
    const order = await Order.create({ ...req.body, orderNumber, userId: user?._id || null });
    res.status(201).json(toOrder(order));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get('/api/orders/my', auth, async (req, res) => {
  const orders = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 });
  res.json(orders.map(toOrder));
});

app.post('/api/promo-codes/validate', async (req, res) => {
  const code = String(req.body.code || '').toUpperCase().trim();
  const subtotal = Number(req.body.subtotal || 0);
  const promo = await PromoCode.findOne({ code, active: true });
  if (!promo) return res.status(404).json({ message: 'Invalid coupon code' });
  if (promo.expiresAt && promo.expiresAt < new Date()) return res.status(400).json({ message: 'Coupon has expired' });
  if (promo.minOrder && subtotal < promo.minOrder) return res.status(400).json({ message: `Minimum order is ৳${promo.minOrder}` });
  if (promo.maxUses && promo.usedCount >= promo.maxUses) return res.status(400).json({ message: 'Coupon usage limit reached' });
  const discount = promo.discountType === 'percentage' ? Math.round(subtotal * promo.discountValue / 100) : promo.discountValue;
  res.json({ code: promo.code, discountAmount: Math.min(discount, subtotal), promo: toPromo(promo) });
});

function toPromo(p) {
  return { id: String(p._id), code: p.code, description: p.description, discountType: p.discountType, discountValue: p.discountValue, minOrder: p.minOrder, maxUses: p.maxUses, usedCount: p.usedCount, appliesTo: p.appliesTo, productId: p.productId, categorySlug: p.categorySlug, expiresAt: p.expiresAt, active: p.active, created_at: p.createdAt };
}

app.get('/api/admin/stats', auth, requireRole('admin'), async (_req, res) => {
  const [sellers, pendingSellers, products, orders, paidOrders, activePromos] = await Promise.all([
    User.countDocuments({ role: 'seller' }), User.countDocuments({ role: 'seller', sellerStatus: 'pending' }), Product.countDocuments(), Order.countDocuments(), Order.find({ paymentStatus: 'paid' }), PromoCode.countDocuments({ active: true }),
  ]);
  res.json({ sellers, pendingSellers, products, orders, revenue: paidOrders.reduce((s, o) => s + (o.totalAmount || 0), 0), activePromos });
});

app.get('/api/admin/orders', auth, requireRole('admin'), async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {};
  const orders = await Order.find(filter).sort({ createdAt: -1 });
  res.json(orders.map(toOrder));
});
app.patch('/api/admin/orders/:id', auth, requireRole('admin'), async (req, res) => {
  const patch = {};
  if (req.body.status) patch.status = req.body.status;
  if (req.body.payment_status) patch.paymentStatus = req.body.payment_status;
  const order = await Order.findByIdAndUpdate(req.params.id, patch, { new: true });
  res.json(toOrder(order));
});

app.get('/api/admin/sellers', auth, requireRole('admin'), async (_req, res) => {
  const sellers = await User.find({ role: 'seller' }).sort({ createdAt: -1 });
  res.json(sellers.map(publicUser));
});
app.patch('/api/admin/sellers/:id', auth, requireRole('admin'), async (req, res) => {
  const seller = await User.findByIdAndUpdate(req.params.id, { sellerStatus: req.body.status }, { new: true });
  res.json(publicUser(seller));
});

app.get('/api/admin/products', auth, requireRole('admin'), async (_req, res) => {
  const products = await Product.find({}).sort({ createdAt: -1 });
  res.json(products.map(toProduct));
});
app.post('/api/admin/products', auth, requireRole('admin'), async (req, res) => {
  const product = await Product.create(req.body);
  res.status(201).json(toProduct(product));
});
app.patch('/api/admin/products/:id', auth, requireRole('admin'), async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(toProduct(product));
});
app.delete('/api/admin/products/:id', auth, requireRole('admin'), async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

app.get('/api/admin/promo-codes', auth, requireRole('admin'), async (_req, res) => {
  const promos = await PromoCode.find({}).sort({ createdAt: -1 });
  res.json(promos.map(toPromo));
});
app.post('/api/admin/promo-codes', auth, requireRole('admin'), async (req, res) => {
  const promo = await PromoCode.create({ ...req.body, code: String(req.body.code || '').toUpperCase() });
  res.status(201).json(toPromo(promo));
});
app.patch('/api/admin/promo-codes/:id', auth, requireRole('admin'), async (req, res) => {
  const payload = { ...req.body };
  if (payload.code) payload.code = String(payload.code).toUpperCase();
  const promo = await PromoCode.findByIdAndUpdate(req.params.id, payload, { new: true });
  res.json(toPromo(promo));
});
app.delete('/api/admin/promo-codes/:id', auth, requireRole('admin'), async (req, res) => {
  await PromoCode.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

app.get('/api/seller/me', auth, requireRole('seller'), (req, res) => res.json(publicUser(req.user)));
app.get('/api/seller/products', auth, requireRole('seller'), async (req, res) => {
  const products = await Product.find({ sellerId: req.user._id }).sort({ createdAt: -1 });
  res.json(products.map(toProduct));
});
app.post('/api/seller/products', auth, requireRole('seller'), async (req, res) => {
  if (req.user.sellerStatus !== 'approved') return res.status(403).json({ message: 'Seller account is not approved yet' });
  const product = await Product.create({ ...req.body, sellerId: req.user._id, active: true, rating: 0, reviewCount: 0 });
  res.status(201).json(toProduct(product));
});
app.patch('/api/seller/products/:id', auth, requireRole('seller'), async (req, res) => {
  const product = await Product.findOneAndUpdate({ _id: req.params.id, sellerId: req.user._id }, req.body, { new: true });
  res.json(toProduct(product));
});
app.delete('/api/seller/products/:id', auth, requireRole('seller'), async (req, res) => {
  await Product.findOneAndDelete({ _id: req.params.id, sellerId: req.user._id });
  res.json({ ok: true });
});

if (!MONGODB_URI) {
  console.error('MONGODB_URI is required. Add it in Render environment variables.');
  process.exit(1);
}

mongoose.connect(MONGODB_URI).then(async () => {
  await seedDatabase();

  if (process.env.SERVE_FRONTEND === 'true') {
    const distPath = path.join(__dirname, '..', 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  } else {
    app.get('/', (_req, res) => res.json({ ok: true, service: 'shoppy-api' }));
  }

  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch((err) => {
  console.error('MongoDB connection failed:', err);
  process.exit(1);
});
