import mongoose from 'mongoose';
import { toJSON } from './index.js';
const promoCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  description: String,
  discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
  discountValue: { type: Number, required: true },
  minOrderAmount: { type: Number, default: 0 },
  maxUses: Number,
  usedCount: { type: Number, default: 0 },
  appliesTo: { type: String, enum: ['all', 'product', 'category'], default: 'all' },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
  categorySlug: String,
  expiresAt: Date,
  active: { type: Boolean, default: true },
}, { timestamps: true });
toJSON(promoCodeSchema);
export default mongoose.model('PromoCode', promoCodeSchema);
