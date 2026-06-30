import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import bcrypt from 'bcryptjs';
import { connectDB } from '../models/index.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import HeroSlide from '../models/HeroSlide.js';

function loadFrontendSeedData() {
  const root = path.resolve(process.cwd());
  let code = fs.readFileSync(path.join(root, 'src/data/products.ts'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'src/data/categories.ts'), 'utf8');
  code = code.replace(/^import[^;]+;\n?/gm, '');
  code = code.replace(/export const (\w+)\s*:[^=]+=/g, 'const $1 =');
  code = code.replace(/export const (\w+)\s*=/g, 'const $1 =');
  code += '\nglobalThis.seedData = { products, categories, heroSlides };';
  const context = {};
  vm.createContext(context);
  vm.runInContext(code, context);
  return context.seedData;
}

await connectDB();
const { products, categories, heroSlides } = loadFrontendSeedData();
await Promise.all([Product.deleteMany({}), Category.deleteMany({}), HeroSlide.deleteMany({})]);
await Category.insertMany(categories.map((c, i) => ({ name: c.name, image: c.image, slug: c.slug, sortOrder: i })));
await HeroSlide.insertMany(heroSlides.map((h, i) => ({ image: h.image, title: h.title, subtitle: h.subtitle, sortOrder: i, active: true })));
await Product.insertMany(products.map((p) => ({
  legacyId: p.id,
  name: p.name,
  price: p.price,
  originalPrice: p.originalPrice,
  image: p.image,
  images: p.images || [p.image],
  category: p.category,
  brand: p.brand,
  rating: p.rating || 0,
  reviewCount: p.reviewCount || 0,
  badge: p.badge || null,
  discount: p.discount,
  stock: p.stock || 0,
  description: p.description,
  features: p.features || [],
  specifications: p.specifications || {},
  active: true,
})));
const email = process.env.ADMIN_EMAIL || 'admin@gmail.com';
const password = process.env.ADMIN_PASSWORD || 'Qwertyuiop09';
await User.findOneAndUpdate(
  { email: email.toLowerCase() },
  { fullName: 'Admin', email, role: 'admin', passwordHash: await bcrypt.hash(password, 10) },
  { upsert: true, new: true }
);
console.log(`Seeded ${categories.length} categories, ${products.length} products, ${heroSlides.length} hero slides, and default admin ${email}`);
process.exit(0);
