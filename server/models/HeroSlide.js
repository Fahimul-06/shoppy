import mongoose from 'mongoose';
import { toJSON } from './index.js';
const heroSlideSchema = new mongoose.Schema({
  image: String,
  title: String,
  subtitle: String,
  link: String,
  placement: { type: String, enum: ['hero', 'header', 'event', 'voucher', 'campaign'], default: 'hero' },
  relatedType: { type: String, enum: ['all', 'category', 'brand', 'seller', 'product', 'search'], default: 'all' },
  relatedValue: String,
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  sortOrder: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
}, { timestamps: true });
toJSON(heroSlideSchema);
export default mongoose.model('HeroSlide', heroSlideSchema);
