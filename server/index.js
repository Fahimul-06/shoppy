import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { products as seedProducts, categories as seedCategories, heroSlides as seedHeroSlides } from './seedData.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-before-production';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/shoppy';

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));

const flexibleOptions = {
  strict: false,
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: {
    virtuals: true,
    transform(_doc, ret) {
      ret.id = ret.id || String(ret._id);
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
};

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['customer', 'seller', 'admin'], default: 'customer' },
}, flexibleOptions);

const ProfileSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  email: String,
  full_name: String,
  phone: String,
}, flexibleOptions);

const SellerSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  email: String,
  business_name: String,
  owner_name: String,
  phone: String,
  address: String,
  status: { type: String, default: 'pending' },
  document_url: String,
  rejection_reason: String,
  reviewed_at: Date,
  reviewed_by: String,
}, flexibleOptions);

const ProductSchema = new mongoose.Schema({
  legacy_id: String,
  name: { type: String, required: true },
  price: { type: Number, required: true },
  original_price: Number,
  image: String,
  images: [String],
  category_slug: String,
  brand: String,
  rating: { type: Number, default: 0 },
  review_count: { type: Number, default: 0 },
  badge: String,
  discount: Number,
  stock: { type: Number, default: 0 },
  description: String,
  features: [String],
  specifications: Object,
  active: { type: Boolean, default: true },
  seller_id: String,
}, flexibleOptions);
ProductSchema.index({ name: 'text', brand: 'text', description: 'text' });
ProductSchema.index({ legacy_id: 1 });
ProductSchema.index({ category_slug: 1 });

const CategorySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: String,
  image: String,
  slug: { type: String, unique: true },
  sort_order: Number,
}, flexibleOptions);

const HeroSlideSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  image: String,
  title: String,
  subtitle: String,
  active: { type: Boolean, default: true },
  sort_order: Number,
}, flexibleOptions);

const OrderSchema = new mongoose.Schema({
  user_id: String,
  order_number: String,
  subtotal: Number,
  discount_amount: { type: Number, default: 0 },
  delivery_fee: { type: Number, default: 0 },
  total_amount: Number,
  payment_method: String,
  payment_status: { type: String, default: 'pending' },
  status: { type: String, default: 'pending' },
  shipping_address: Object,
}, flexibleOptions);

const OrderItemSchema = new mongoose.Schema({
  order_id: String,
  product_id: String,
  product_snapshot: Object,
  quantity: Number,
  unit_price: Number,
  total_price: Number,
}, flexibleOptions);

const PromoCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  description: String,
  discount_type: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
  discount_value: Number,
  min_order: Number,
  min_order_amount: Number,
  max_uses: Number,
  used_count: { type: Number, default: 0 },
  applies_to: { type: String, enum: ['all', 'product', 'category'], default: 'all' },
  product_id: String,
  category_slug: String,
  expires_at: Date,
  active: { type: Boolean, default: true },
}, flexibleOptions);

const WishlistSchema = new mongoose.Schema({ user_id: String, product_id: String }, flexibleOptions);
const AdminUserSchema = new mongoose.Schema({ id: { type: String, unique: true }, email: String }, flexibleOptions);

const User = mongoose.model('User', UserSchema);
const models = {
  profiles: mongoose.model('Profile', ProfileSchema),
  sellers: mongoose.model('Seller', SellerSchema),
  products: mongoose.model('Product', ProductSchema),
  categories: mongoose.model('Category', CategorySchema),
  hero_slides: mongoose.model('HeroSlide', HeroSlideSchema),
  orders: mongoose.model('Order', OrderSchema),
  order_items: mongoose.model('OrderItem', OrderItemSchema),
  promo_codes: mongoose.model('PromoCode', PromoCodeSchema),
  wishlists: mongoose.model('Wishlist', WishlistSchema),
  admin_users: mongoose.model('AdminUser', AdminUserSchema),
};

function toPlain(doc) {
  if (!doc) return null;
  const obj = typeof doc.toJSON === 'function' ? doc.toJSON() : doc;
  obj.id = obj.id || String(obj._id || obj.id);
  return obj;
}

function normalizeValue(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;
  if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) return Number(value);
  return value;
}

function authRequired(req, _res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return next();
  try { req.user = jwt.verify(token, JWT_SECRET); } catch { req.user = null; }
  next();
}
app.use(authRequired);

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  next();
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
}

function tokenFor(user) {
  return jwt.sign({ id: String(user._id), email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}

async function seedDatabaseIfEmpty() {
  const productCount = await models.products.countDocuments();
  if (productCount === 0) {
    await models.products.insertMany(seedProducts.map((p) => ({
      id: p.id,
      legacy_id: p.id,
      name: p.name,
      price: p.price,
      original_price: p.originalPrice,
      image: p.image,
      images: p.images || [],
      category_slug: p.category,
      brand: p.brand,
      rating: p.rating || 0,
      review_count: p.reviewCount || 0,
      badge: p.badge,
      discount: p.discount,
      stock: p.stock || 0,
      description: p.description,
      features: p.features || [],
      specifications: p.specifications || {},
      active: true,
    })));
  }
  if (await models.categories.countDocuments() === 0) {
    await models.categories.insertMany(seedCategories.map((c, index) => ({ ...c, sort_order: index + 1 })));
  }
  if (await models.hero_slides.countDocuments() === 0) {
    await models.hero_slides.insertMany(seedHeroSlides.map((h, index) => ({ ...h, active: true, sort_order: index + 1 })));
  }
  if (await models.promo_codes.countDocuments() === 0) {
    await models.promo_codes.create({
      code: 'CARTUP10',
      description: 'Default 10% cart discount',
      discount_type: 'percentage',
      discount_value: 10,
      min_order: 0,
      min_order_amount: 0,
      applies_to: 'all',
      active: true,
    });
  }
}

app.get('/api/health', (_req, res) => res.json({ ok: true, database: 'mongodb' }));

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, role = 'customer', full_name, phone } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) return res.status(409).json({ error: 'Email already registered' });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash, role });
    await models.profiles.findOneAndUpdate(
      { id: String(user._id) },
      { id: String(user._id), email: user.email, full_name, phone },
      { upsert: true, new: true }
    );
    const token = tokenFor(user);
    res.status(201).json({ token, user: { id: String(user._id), email: user.email, role: user.role } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: String(email || '').toLowerCase().trim() });
    if (!user || !(await bcrypt.compare(password || '', user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    res.json({ token: tokenFor(user), user: { id: String(user._id), email: user.email, role: user.role } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(401).json({ error: 'User not found' });
  res.json({ user: { id: String(user._id), email: user.email, role: user.role } });
});

app.patch('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const update = {};
    if (req.body.email) update.email = String(req.body.email).toLowerCase().trim();
    if (req.body.password) update.passwordHash = await bcrypt.hash(req.body.password, 10);
    const user = await User.findByIdAndUpdate(req.user.id, update, { new: true });
    if (update.email) {
      await models.profiles.findOneAndUpdate({ id: req.user.id }, { email: update.email });
      await models.admin_users.findOneAndUpdate({ id: req.user.id }, { email: update.email });
    }
    res.json({ user: { id: String(user._id), email: user.email, role: user.role } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/claim-first', requireAuth, async (req, res) => {
  try {
    const admins = await models.admin_users.countDocuments();
    if (admins > 0) return res.status(409).json({ result: 'exists', error: 'An admin already exists' });
    const user = await User.findByIdAndUpdate(req.user.id, { role: 'admin' }, { new: true });
    await models.admin_users.create({ id: String(user._id), email: user.email });
    res.json({ result: 'success', token: tokenFor(user), user: { id: String(user._id), email: user.email, role: 'admin' } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/stats', requireAuth, requireAdmin, async (_req, res) => {
  const [totalSellers, pendingSellers, totalProducts, totalOrders, paidOrders, activePromos] = await Promise.all([
    models.sellers.countDocuments(),
    models.sellers.countDocuments({ status: 'pending' }),
    models.products.countDocuments(),
    models.orders.countDocuments(),
    models.orders.find({ payment_status: 'paid' }),
    models.promo_codes.countDocuments({ active: true }),
  ]);
  const revenue = paidOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
  res.json({ totalSellers, pendingSellers, totalProducts, totalOrders, revenue, activePromos });
});

app.get('/api/orders/:id/items', requireAuth, async (req, res) => {
  const items = await models.order_items.find({ order_id: req.params.id }).sort({ created_at: 1 });
  res.json({ data: items.map(toPlain) });
});

function buildFilter(req) {
  const filter = {};
  const filters = req.query.filters ? JSON.parse(req.query.filters) : [];
  for (const item of filters) {
    if (item.op === 'eq') filter[item.field] = normalizeValue(item.value);
  }
  if (req.query.or) {
    const raw = String(req.query.or);
    const match = raw.match(/%(.+?)%/);
    const q = match ? match[1] : raw;
    filter.$or = [
      { name: new RegExp(q, 'i') },
      { brand: new RegExp(q, 'i') },
      { description: new RegExp(q, 'i') },
    ];
  }
  return filter;
}


app.put('/api/:table/upsert', requireAuth, async (req, res) => {
  try {
    const Model = models[req.params.table];
    if (!Model) return res.status(404).json({ error: 'Unknown table' });
    const payload = req.body;
    const rows = Array.isArray(payload) ? payload : [payload];
    const saved = [];
    for (const row of rows) {
      const key = row.id ? { id: row.id } : row._id ? { _id: row._id } : row.email ? { email: row.email } : null;
      if (!key) saved.push(await Model.create(row));
      else saved.push(await Model.findOneAndUpdate(key, row, { upsert: true, new: true, setDefaultsOnInsert: true }));
    }
    res.json({ data: Array.isArray(payload) ? saved.map(toPlain) : toPlain(saved[0]) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/:table', async (req, res) => {
  try {
    const Model = models[req.params.table];
    if (!Model) return res.status(404).json({ error: 'Unknown table' });
    const filter = buildFilter(req);
    const count = await Model.countDocuments(filter);
    if (req.query.head === 'true') return res.json({ data: null, count });

    let query = Model.find(filter);
    if (req.query.orderField) query = query.sort({ [req.query.orderField]: req.query.orderAscending === 'true' ? 1 : -1 });
    if (req.query.limit) query = query.limit(Number(req.query.limit));
    const rows = await query;

    let data = rows.map(toPlain);
    if (req.params.table === 'orders') {
      data = await Promise.all(data.map(async (order) => ({
        ...order,
        order_items: (await models.order_items.find({ order_id: order.id })).map(toPlain),
      })));
    }
    if (req.params.table === 'wishlists') {
      data = await Promise.all(data.map(async (row) => ({
        ...row,
        products: toPlain(await models.products.findOne({ id: row.product_id })) || toPlain(await models.products.findById(row.product_id).catch(() => null)),
      })));
    }
    res.json({ data, count });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/:table', requireAuth, async (req, res) => {
  try {
    const Model = models[req.params.table];
    if (!Model) return res.status(404).json({ error: 'Unknown table' });
    const payload = Array.isArray(req.body) ? req.body : [req.body];
    const rows = [];
    for (const item of payload) {
      if (req.params.table === 'products' && !item.id) item.id = new mongoose.Types.ObjectId().toString();
      if (req.params.table === 'orders') {
        item.id = item.id || new mongoose.Types.ObjectId().toString();
        item.user_id = item.user_id || req.user.id;
        item.order_number = item.order_number || `ORD-${Date.now().toString().slice(-8)}`;
        item.status = item.status || 'pending';
      }
      rows.push(await Model.create(item));
    }
    res.status(201).json({ data: Array.isArray(req.body) ? rows.map(toPlain) : toPlain(rows[0]) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/:table', requireAuth, async (req, res) => {
  try {
    const Model = models[req.params.table];
    if (!Model) return res.status(404).json({ error: 'Unknown table' });
    const filter = buildFilter(req);
    const result = await Model.updateMany(filter, req.body, { runValidators: false });
    const rows = await Model.find(filter);
    res.json({ data: rows.map(toPlain), count: result.modifiedCount });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/:table', requireAuth, async (req, res) => {
  try {
    const Model = models[req.params.table];
    if (!Model) return res.status(404).json({ error: 'Unknown table' });
    const filter = buildFilter(req);
    const result = await Model.deleteMany(filter);
    res.json({ data: null, count: result.deletedCount });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

mongoose.connect(MONGODB_URI)
  .then(async () => {
    await seedDatabaseIfEmpty();
    app.listen(PORT, () => console.log(`Shoppy MongoDB API running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
