import mongoose from 'mongoose';
import { toJSON } from './index.js';

const customerNotificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  audience: { type: String, enum: ['customer', 'customers'], default: 'customer', index: true },
  type: {
    type: String,
    enum: ['order_processing', 'order_shipped', 'order_delivered', 'promo', 'sale', 'event', 'system'],
    default: 'system',
    index: true,
  },
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  link: { type: String, default: '/notifications' },
  image: String,
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  promo: { type: mongoose.Schema.Types.ObjectId, ref: 'PromoCode', default: null },
  active: { type: Boolean, default: true, index: true },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

customerNotificationSchema.index({ user: 1, createdAt: -1 });
customerNotificationSchema.index({ audience: 1, active: 1, createdAt: -1 });

toJSON(customerNotificationSchema);
export default mongoose.model('CustomerNotification', customerNotificationSchema);
