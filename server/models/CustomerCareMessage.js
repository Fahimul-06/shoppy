import mongoose from 'mongoose';
import { toJSON } from './index.js';

const customerCareMessageSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  senderType: { type: String, enum: ['customer', 'admin'], required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, required: true },
  message: { type: String, required: true, trim: true, maxlength: 2000 },
  readByCustomer: { type: Boolean, default: false },
  readByAdmin: { type: Boolean, default: false },
}, { timestamps: true });

customerCareMessageSchema.index({ customer: 1, createdAt: 1 });
toJSON(customerCareMessageSchema);
export default mongoose.model('CustomerCareMessage', customerCareMessageSchema);
