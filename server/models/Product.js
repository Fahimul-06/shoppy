import mongoose from 'mongoose';
import { toJSON } from './index.js';
const productSchema = new mongoose.Schema({
  legacyId: { type: String, index: true },
  name: { type: String, required: true, trim: true },
  price: { type: Number, required: true },
  originalPrice: Number,
  image: { type: String, required: true },
  images: [String],
  category: { type: String, required: true, index: true },
  subcategory: { type: String, default: '', index: true },
  childCategory: { type: String, default: '', index: true },
  brand: String,
  rating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  badge: { type: String, enum: ['sale', 'new', 'hot', null], default: null },
  discount: Number,
  isDailySale: { type: Boolean, default: false, index: true },
  isFlashSale: { type: Boolean, default: false, index: true },
  saleStartAt: Date,
  saleEndAt: Date,
  stock: { type: Number, default: 0 },
  description: String,
  features: [String],
  specifications: { type: Map, of: String, default: {} },
  active: { type: Boolean, default: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', default: null },
}, { timestamps: true });
toJSON(productSchema);
export default mongoose.model('Product', productSchema);
