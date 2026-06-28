import mongoose from 'mongoose';
import { toJSON } from './index.js';
const heroSlideSchema = new mongoose.Schema({
  image: String,
  title: String,
  subtitle: String,
  link: String,
  placement: { type: String, enum: ['hero', 'header'], default: 'hero' },
  bannerType: { type: String, enum: ['generic', 'event', 'voucher', 'campaign'], default: 'generic' },
  categories: [{ type: String, trim: true }],
  brands: [{ type: String, trim: true }],
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  promo: { type: mongoose.Schema.Types.ObjectId, ref: 'PromoCode', default: null },
  sortOrder: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
}, { timestamps: true });
toJSON(heroSlideSchema);
export default mongoose.model('HeroSlide', heroSlideSchema);
