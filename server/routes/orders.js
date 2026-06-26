import express from 'express';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import ReturnRequest from '../models/ReturnRequest.js';
import { requireUser } from '../middleware/auth.js';
const router = express.Router();

router.post('/', requireUser, async (req, res) => {
  const { subtotal, discount_amount, delivery_fee, total_amount, payment_method, shipping_address, items } = req.body;
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: 'Order items are required' });
  const orderItems = [];
  for (const item of items) {
    const productId = item.product_id || item.productId;
    if (!mongoose.isValidObjectId(productId)) return res.status(400).json({ message: `Invalid MongoDB productId: ${productId}` });
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: `Product not found: ${productId}` });
    orderItems.push({
      product: product.id,
      productSnapshot: item.product_snapshot || item.productSnapshot || product.toJSON(),
      quantity: Number(item.quantity),
      unitPrice: Number(item.unit_price ?? item.unitPrice),
      totalPrice: Number(item.total_price ?? item.totalPrice),
    });
  }
  const order = await Order.create({
    user: req.user.id,
    items: orderItems,
    subtotal,
    discountAmount: discount_amount ?? 0,
    deliveryFee: delivery_fee ?? 0,
    totalAmount: total_amount,
    paymentMethod: payment_method,
    shippingAddress: shipping_address,
  });
  res.status(201).json({ order });
});

router.get('/my', requireUser, async (req, res) => {
  const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });
  res.json({ orders });
});

router.get('/returns/my', requireUser, async (req, res) => {
  const returns = await ReturnRequest.find({ user: req.user.id })
    .populate('order')
    .populate('product')
    .populate('seller')
    .sort({ createdAt: -1 });
  res.json({ returns });
});

router.post('/returns', requireUser, async (req, res) => {
  const { orderId, orderItemId, reason, details, quantity } = req.body || {};
  if (!mongoose.isValidObjectId(orderId)) return res.status(400).json({ message: 'Valid orderId is required' });
  if (!mongoose.isValidObjectId(orderItemId)) return res.status(400).json({ message: 'Valid orderItemId is required' });
  if (!reason || String(reason).trim().length < 3) return res.status(400).json({ message: 'Return reason is required' });

  const order = await Order.findOne({ _id: orderId, user: req.user.id });
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (order.status !== 'delivered') return res.status(400).json({ message: 'Only delivered orders can be returned' });

  const item = order.items.id(orderItemId);
  if (!item) return res.status(404).json({ message: 'Order item not found' });

  const product = await Product.findById(item.product);
  if (!product) return res.status(404).json({ message: 'Product not found' });

  const exists = await ReturnRequest.findOne({ order: order._id, orderItem: item._id, user: req.user._id });
  if (exists) return res.status(409).json({ message: 'Return request already exists for this product' });

  const requestedQty = Math.min(Number(quantity || item.quantity || 1), Number(item.quantity || 1));
  const returnRequest = await ReturnRequest.create({
    order: order._id,
    orderItem: item._id,
    user: req.user._id,
    product: product._id,
    seller: product.seller || null,
    quantity: requestedQty,
    reason: String(reason).trim(),
    details: details ? String(details).trim() : '',
  });

  await returnRequest.populate(['order', 'product', 'seller']);
  res.status(201).json({ message: 'Return request submitted for admin review', returnRequest });
});

router.patch('/:id/cancel', requireUser, async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user.id });
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (!['pending', 'processing'].includes(order.status)) return res.status(400).json({ message: 'Only pending or processing orders can be cancelled' });
  order.status = 'cancelled';
  order.cancelReason = req.body?.reason || 'Cancelled by customer';
  order.cancelledAt = new Date();
  await order.save();
  res.json({ message: 'Order cancelled successfully', order });
});
export default router;
