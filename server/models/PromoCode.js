import mongoose from 'mongoose';
import { toJSON } from './index.js';

const promoCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  description: String,
  discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
  discountValue: { type: Number, required: true, min: 0 },
  minOrderAmount: { type: Number, default: 0 },
  maxDiscountAmount: { type: Number, default: 0 },
  maxUses: Number,
  usedCount: { type: Number, default: 0 },

  // Targeting rules. Empty arrays mean the rule is not restricted by that field.
  appliesTo: {
    type: String,
    enum: ['all', 'category', 'brand', 'seller', 'product', 'custom'],
    default: 'all',
  },
  categories: [{ type: String, trim: true }],
  subcategories: [{ type: String, trim: true }],
  childCategories: [{ type: String, trim: true }],
  brands: [{ type: String, trim: true }],
  sellers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Seller' }],
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],

  // Backward compatibility with older promo records.
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
  categorySlug: String,

  startsAt: { type: Date, default: null },
  expiresAt: { type: Date, default: null },
  active: { type: Boolean, default: true },
}, { timestamps: true });

toJSON(promoCodeSchema);
export default mongoose.model('PromoCode', promoCodeSchema);
