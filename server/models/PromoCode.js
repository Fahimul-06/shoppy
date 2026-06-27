import mongoose from 'mongoose';
import { toJSON } from './index.js';

const promoCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  description: String,
  image: String,
  discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
  discountValue: { type: Number, required: true },
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

  // Voucher usage conditions. Empty arrays/false mean no restriction.
  voucherType: {
    type: String,
    enum: ['general', 'payment_type', 'payment_method', 'bank_card', 'weekend_deal', 'store_usage'],
    default: 'general',
  },
  paymentTypes: [{ type: String, trim: true }], // prepaid, cod, card, mobile_banking
  paymentMethods: [{ type: String, trim: true }], // bkash, nagad, card, cod
  banks: [{ type: String, trim: true }],
  cardTypes: [{ type: String, trim: true }], // visa, mastercard, amex, debit, credit
  weekendOnly: { type: Boolean, default: false },

  // Backward compatibility with older promo records.
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
  categorySlug: String,

  startsAt: Date,
  expiresAt: Date,
  active: { type: Boolean, default: true },
}, { timestamps: true });

toJSON(promoCodeSchema);
export default mongoose.model('PromoCode', promoCodeSchema);
