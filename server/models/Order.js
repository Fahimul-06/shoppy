import mongoose from 'mongoose';
import { toJSON } from './index.js';

function makeOrderBarcodeSvgDataUrl(value) {
  const raw = String(value || '').replace(/[^0-9]/g, '').padStart(12, '0').slice(-12);
  const patterns = ['212222','222122','222221','121223','121322','131222','122213','122312','132212','221213'];
  const sequence = ['211214', ...raw.split('').map((d) => patterns[Number(d)] || patterns[0]), '2331112'];
  let x = 10;
  const bars = [];
  sequence.join('').split('').forEach((widthChar, index) => {
    const width = Number(widthChar) || 1;
    if (index % 2 === 0) bars.push(`<rect x="${x}" y="10" width="${width * 2}" height="58" fill="#111827"/>`);
    x += width * 2;
  });
  const width = Math.max(220, x + 10);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="96" viewBox="0 0 ${width} 96"><rect width="100%" height="100%" fill="#ffffff"/>${bars.join('')}<text x="50%" y="88" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" font-weight="700" letter-spacing="2" fill="#111827">${raw}</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

async function generateUniqueOrderBarcodeValue(OrderModel) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const value = `${Date.now()}${Math.floor(Math.random() * 900 + 100)}`.slice(-12);
    const exists = await OrderModel.exists({ orderBarcodeValue: value });
    if (!exists) return value;
  }
  return `${Date.now()}${Math.floor(Math.random() * 9000 + 1000)}`.slice(-12);
}

export async function ensureOrderBarcode(order) {
  if (!order.orderNumber) order.orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;
  if (!order.orderBarcodeValue) order.orderBarcodeValue = await generateUniqueOrderBarcodeValue(order.constructor);
  if (!order.orderBarcode) order.orderBarcode = makeOrderBarcodeSvgDataUrl(order.orderBarcodeValue);
  return order;
}
const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productSnapshot: { type: Object, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  selectedColor: { type: String, default: '' },
  selectedSize: { type: String, default: '' },
  cancellationStatus: { type: String, enum: ['none', 'cancelled'], default: 'none' },
  cancelReason: String,
  cancelledAt: Date,
}, { _id: true });
const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, unique: true, index: true },
  orderBarcodeValue: { type: String, unique: true, sparse: true, index: true },
  orderBarcode: { type: String, trim: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [orderItemSchema],
  subtotal: Number,
  discountAmount: { type: Number, default: 0 },
  promoCode: { type: String, uppercase: true, trim: true, default: '' },
  promo: { type: mongoose.Schema.Types.ObjectId, ref: 'PromoCode', default: null },
  deliveryFee: { type: Number, default: 0 },
  platformFee: { type: Number, default: 0 },
  vatAmount: { type: Number, default: 0 },
  totalAmount: Number,
  paymentMethod: String,
  paymentDetails: { type: Object, default: {} },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
  status: { type: String, enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'], default: 'pending' },
  shippingAddress: Object,
  deliveryMan: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  assignedToDeliveryAt: Date,
  cancelReason: String,
  cancelledAt: Date,
}, { timestamps: true });
orderSchema.pre('save', async function(next) {
  try {
    await ensureOrderBarcode(this);
    next();
  } catch (error) {
    next(error);
  }
});
toJSON(orderSchema);
export default mongoose.model('Order', orderSchema);
