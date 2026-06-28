import mongoose from 'mongoose';
import { toJSON } from './index.js';
const productSchema = new mongoose.Schema({
  legacyId: { type: String, index: true },
  name: { type: String, required: true, trim: true },
  price: { type: Number, required: true },
  originalPrice: Number,
  image: { type: String, required: true },
  images: [String],
  colorOptions: { type: [String], default: [] },
  sizeOptions: { type: [String], default: [] },
  category: { type: String, required: true, index: true },
  subcategory: { type: String, default: '', index: true },
  childCategory: { type: String, default: '', index: true },
  brand: String,
  rating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  badge: { type: String, enum: ['sale', 'new', 'hot', null], default: null },
  saleTags: { type: [String], enum: ['daily', 'flash'], default: [] },
  newArrival: { type: Boolean, default: false, index: true },
  soldCount: { type: Number, default: 0, min: 0 },
  discount: Number,
  dailySaleDiscount: { type: Number, default: 0, min: 0, max: 100 },
  flashSaleDiscount: { type: Number, default: 0, min: 0, max: 100 },
  freeDelivery: { type: Boolean, default: false, index: true },
  stock: { type: Number, default: 0 },
  description: String,
  features: [String],
  specifications: { type: Map, of: String, default: {} },
  active: { type: Boolean, default: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', default: null },
}, { timestamps: true });
toJSON(productSchema);
export default mongoose.model('Product', productSchema);
