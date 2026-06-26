import mongoose from 'mongoose';
import { toJSON } from './index.js';
const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productSnapshot: { type: Object, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
}, { _id: true });
const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, unique: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [orderItemSchema],
  subtotal: Number,
  discountAmount: { type: Number, default: 0 },
  deliveryFee: { type: Number, default: 0 },
  totalAmount: Number,
  paymentMethod: String,
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
  status: { type: String, enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'], default: 'pending' },
  shippingAddress: Object,
}, { timestamps: true });
orderSchema.pre('save', function(next) {
  if (!this.orderNumber) this.orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;
  next();
});
toJSON(orderSchema);
export default mongoose.model('Order', orderSchema);
