import mongoose from 'mongoose';
import { toJSON } from './index.js';
const heroSlideSchema = new mongoose.Schema({
  image: String,
  title: String,
  subtitle: String,
  link: String,
  placement: { type: String, enum: ['hero', 'header', 'event', 'voucher', 'campaign'], default: 'hero' },
  targetType: { type: String, enum: ['all', 'category', 'brand', 'seller', 'products', 'customLink'], default: 'all' },
  targetValue: String,
  productIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  sortOrder: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
}, { timestamps: true });
toJSON(heroSlideSchema);
export default mongoose.model('HeroSlide', heroSlideSchema);
