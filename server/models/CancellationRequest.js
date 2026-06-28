import mongoose from 'mongoose';
import { toJSON } from './index.js';

const cancellationRequestSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  orderItem: { type: mongoose.Schema.Types.ObjectId, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', default: null, index: true },
  quantity: { type: Number, default: 1, min: 1 },
  reason: { type: String, trim: true, default: 'Cancelled by customer' },
  status: {
    type: String,
    enum: ['cancelled', 'rejected'],
    default: 'cancelled',
    index: true,
  },
  cancelledAt: { type: Date, default: Date.now, index: true },
  adminNote: { type: String, trim: true },
}, { timestamps: true });

cancellationRequestSchema.index({ order: 1, orderItem: 1, user: 1 }, { unique: true });

toJSON(cancellationRequestSchema);
export default mongoose.model('CancellationRequest', cancellationRequestSchema);
