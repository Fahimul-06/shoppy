import mongoose from 'mongoose';
import { toJSON } from './index.js';
const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  image: String,
  slug: { type: String, required: true, unique: true },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });
toJSON(categorySchema);
export default mongoose.model('Category', categorySchema);
