import mongoose from 'mongoose';
import { toJSON } from './index.js';

const deliverySupportMessageSchema = new mongoose.Schema({
  deliveryMan: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  senderType: { type: String, enum: ['delivery', 'admin'], required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  message: { type: String, required: true, trim: true },
  language: { type: String, default: 'bn', trim: true },
  readByAdmin: { type: Boolean, default: false },
  readByDelivery: { type: Boolean, default: false },
}, { timestamps: true });

toJSON(deliverySupportMessageSchema);
export default mongoose.model('DeliverySupportMessage', deliverySupportMessageSchema);
