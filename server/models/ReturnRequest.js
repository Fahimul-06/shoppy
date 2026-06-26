import mongoose from 'mongoose';
import { toJSON } from './index.js';

const returnRequestSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  orderItem: { type: mongoose.Schema.Types.ObjectId, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', default: null, index: true },
  quantity: { type: Number, default: 1, min: 1 },
  reason: { type: String, trim: true, required: true },
  details: { type: String, trim: true },
  status: {
    type: String,
    enum: ['requested', 'approved', 'denied', 'received', 'refunded', 'cancelled'],
    default: 'requested',
    index: true,
  },
  adminNote: { type: String, trim: true },
  sellerNote: { type: String, trim: true },
  decidedAt: Date,
  approvedAt: Date,
  deniedAt: Date,
}, { timestamps: true });

returnRequestSchema.index({ order: 1, orderItem: 1, user: 1 }, { unique: true });

toJSON(returnRequestSchema);
export default mongoose.model('ReturnRequest', returnRequestSchema);
