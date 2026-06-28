import mongoose from 'mongoose';
import { toJSON } from './index.js';

const chatMessageSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  orderItem: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true, index: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  senderType: { type: String, enum: ['customer', 'seller'], required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, required: true },
  message: { type: String, required: true, trim: true, maxlength: 2000 },
  readByCustomer: { type: Boolean, default: false },
  readBySeller: { type: Boolean, default: false },
}, { timestamps: true });

chatMessageSchema.index({ order: 1, orderItem: 1, createdAt: 1 });
toJSON(chatMessageSchema);
export default mongoose.model('ChatMessage', chatMessageSchema);
