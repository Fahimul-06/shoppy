import mongoose from 'mongoose';
import { toJSON } from './index.js';
const heroSlideSchema = new mongoose.Schema({
  image: String,
  title: String,
  subtitle: String,
  sortOrder: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
}, { timestamps: true });
toJSON(heroSlideSchema);
export default mongoose.model('HeroSlide', heroSlideSchema);
