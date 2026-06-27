import mongoose from 'mongoose';
import { toJSON } from './index.js';
const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productSnapshot: { type: Object, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  cancellationStatus: { type: String, enum: ['none', 'cancelled'], default: 'none' },
  cancelReason: String,
  cancelledAt: Date,
}, { _id: true });
const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, unique: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [orderItemSchema],
  subtotal: Number,
  discountAmount: { type: Number, default: 0 },
  promoCode: { type: String, uppercase: true, trim: true, default: '' },
  promo: { type: mongoose.Schema.Types.ObjectId, ref: 'PromoCode', default: null },
  deliveryFee: { type: Number, default: 0 },
  totalAmount: Number,
  paymentMethod: String,
  paymentDetails: { type: Object, default: {} },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
  status: { type: String, enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'], default: 'pending' },
  shippingAddress: Object,
  cancelReason: String,
  cancelledAt: Date,
}, { timestamps: true });
orderSchema.pre('save', function(next) {
  if (!this.orderNumber) this.orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;
  next();
});
toJSON(orderSchema);
export default mongoose.model('Order', orderSchema);
