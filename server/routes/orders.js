import express from 'express';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import ReturnRequest from '../models/ReturnRequest.js';
import CancellationRequest from '../models/CancellationRequest.js';
import ChatMessage from '../models/ChatMessage.js';
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
  const orders = await Order.find({ user: req.user.id })
    .populate({ path: 'items.product', populate: { path: 'seller', select: 'name shopName shopLogo shopAddress status' } })
    .sort({ createdAt: -1 });
  res.json({ orders });
});

async function resolveCustomerChatContext(req, res) {
  const { orderId, orderItemId } = req.params;
  if (!mongoose.isValidObjectId(orderId)) {
    res.status(400).json({ message: 'Valid orderId is required' });
    return null;
  }
  if (!mongoose.isValidObjectId(orderItemId)) {
    res.status(400).json({ message: 'Valid orderItemId is required' });
    return null;
  }
  const order = await Order.findOne({ _id: orderId, user: req.user.id }).populate({ path: 'items.product', populate: { path: 'seller', select: 'name shopName shopLogo shopAddress status' } });
  if (!order) {
    res.status(404).json({ message: 'Order not found' });
    return null;
  }
  const item = order.items.id(orderItemId);
  if (!item) {
    res.status(404).json({ message: 'Ordered product not found' });
    return null;
  }
  const product = item.product?._id ? item.product : await Product.findById(item.product);
  if (!product) {
    res.status(404).json({ message: 'Product not found' });
    return null;
  }
  if (!product.seller) {
    res.status(400).json({ message: 'This product is not sold by a seller' });
    return null;
  }
  return { order, item, product };
}

router.get('/chats/:orderId/:orderItemId', requireUser, async (req, res) => {
  const ctx = await resolveCustomerChatContext(req, res);
  if (!ctx) return;
  await ChatMessage.updateMany({ order: ctx.order._id, orderItem: ctx.item._id, customer: req.user._id }, { readByCustomer: true });
  const messages = await ChatMessage.find({ order: ctx.order._id, orderItem: ctx.item._id, customer: req.user._id })
    .sort({ createdAt: 1 });
  res.json({
    order: ctx.order,
    orderItem: ctx.item,
    product: ctx.product,
    seller: ctx.product.seller || null,
    messages,
  });
});

router.post('/chats/:orderId/:orderItemId', requireUser, async (req, res) => {
  const ctx = await resolveCustomerChatContext(req, res);
  if (!ctx) return;
  const message = String(req.body?.message || '').trim();
  if (!message) return res.status(400).json({ message: 'Message is required' });
  const chatMessage = await ChatMessage.create({
    order: ctx.order._id,
    orderItem: ctx.item._id,
    product: ctx.product._id,
    seller: ctx.product.seller,
    customer: req.user._id,
    senderType: 'customer',
    sender: req.user._id,
    message,
    readByCustomer: true,
    readBySeller: false,
  });
  res.status(201).json({ message: chatMessage });
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


const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
const isWithinCancellationWindow = (order) => Date.now() - new Date(order.createdAt).getTime() <= TWELVE_HOURS_MS;
const activeItems = (order) => order.items.filter((item) => item.cancellationStatus !== 'cancelled');

router.get('/cancellations/my', requireUser, async (req, res) => {
  const cancellations = await CancellationRequest.find({ user: req.user.id })
    .populate('order')
    .populate('product')
    .populate('seller')
    .sort({ createdAt: -1 });
  res.json({ cancellations });
});

router.post('/cancellations', requireUser, async (req, res) => {
  const { orderId, orderItemId, reason } = req.body || {};
  if (!mongoose.isValidObjectId(orderId)) return res.status(400).json({ message: 'Valid orderId is required' });
  if (!mongoose.isValidObjectId(orderItemId)) return res.status(400).json({ message: 'Valid orderItemId is required' });

  const order = await Order.findOne({ _id: orderId, user: req.user.id });
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (!['pending', 'processing'].includes(order.status)) return res.status(400).json({ message: 'Only pending or processing ordered products can be cancelled' });
  if (!isWithinCancellationWindow(order)) return res.status(400).json({ message: 'Cancellation is allowed only within 12 hours of placing the order' });

  const item = order.items.id(orderItemId);
  if (!item) return res.status(404).json({ message: 'Ordered product not found' });
  if (item.cancellationStatus === 'cancelled') return res.status(409).json({ message: 'This ordered product is already cancelled' });

  const product = await Product.findById(item.product);
  if (!product) return res.status(404).json({ message: 'Product not found' });

  const exists = await CancellationRequest.findOne({ order: order._id, orderItem: item._id, user: req.user._id });
  if (exists) return res.status(409).json({ message: 'Cancellation already exists for this ordered product' });

  item.cancellationStatus = 'cancelled';
  item.cancelReason = reason || 'Cancelled by customer';
  item.cancelledAt = new Date();

  const cancelledAmount = Number(item.totalPrice || 0);
  order.subtotal = Math.max(0, Number(order.subtotal || 0) - cancelledAmount);
  order.totalAmount = Math.max(0, Number(order.totalAmount || 0) - cancelledAmount);
  order.cancelReason = reason || 'Product cancelled by customer';
  order.cancelledAt = new Date();
  if (activeItems(order).length === 0) order.status = 'cancelled';

  const cancellation = await CancellationRequest.create({
    order: order._id,
    orderItem: item._id,
    user: req.user._id,
    product: product._id,
    seller: product.seller || null,
    quantity: item.quantity,
    reason: reason || 'Cancelled by customer',
    status: 'cancelled',
    cancelledAt: item.cancelledAt,
  });

  await order.save();
  await cancellation.populate(['order', 'product', 'seller']);
  res.status(201).json({ message: 'Ordered product cancelled successfully', cancellation, order });
});

router.patch('/:id/cancel', requireUser, async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user.id });
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (!['pending', 'processing'].includes(order.status)) return res.status(400).json({ message: 'Only pending or processing orders can be cancelled' });
  if (!isWithinCancellationWindow(order)) return res.status(400).json({ message: 'Cancellation is allowed only within 12 hours of placing the order' });
  order.status = 'cancelled';
  order.cancelReason = req.body?.reason || 'Cancelled by customer';
  order.cancelledAt = new Date();
  for (const item of order.items) {
    if (item.cancellationStatus !== 'cancelled') {
      item.cancellationStatus = 'cancelled';
      item.cancelReason = order.cancelReason;
      item.cancelledAt = order.cancelledAt;
      const product = await Product.findById(item.product);
      if (product) {
        await CancellationRequest.findOneAndUpdate(
          { order: order._id, orderItem: item._id, user: req.user._id },
          { order: order._id, orderItem: item._id, user: req.user._id, product: product._id, seller: product.seller || null, quantity: item.quantity, reason: order.cancelReason, status: 'cancelled', cancelledAt: order.cancelledAt },
          { upsert: true, new: true }
        );
      }
    }
  }
  await order.save();
  res.json({ message: 'Order cancelled successfully', order });
});
export default router;
