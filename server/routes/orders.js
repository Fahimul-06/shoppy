import express from 'express';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import PromoCode from '../models/PromoCode.js';
import ReturnRequest from '../models/ReturnRequest.js';
import CancellationRequest from '../models/CancellationRequest.js';
import ChatMessage from '../models/ChatMessage.js';
import ProductReview from '../models/ProductReview.js';
import { requireUser } from '../middleware/auth.js';
import { calculatePromoDiscount, isPromoActive, promoMatchesUsageConditions } from '../utils/promo.js';
const router = express.Router();

router.post('/', requireUser, async (req, res) => {
  const { delivery_fee, payment_method, payment_type, bank_name, card_type, shipping_address, items } = req.body;
  const promoCode = String(req.body?.promo_code || req.body?.promoCode || '').trim().toUpperCase();
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: 'Order items are required' });

  const orderItems = [];
  const promoItems = [];
  for (const item of items) {
    const productId = item.product_id || item.productId;
    if (!mongoose.isValidObjectId(productId)) return res.status(400).json({ message: `Invalid MongoDB productId: ${productId}` });
    const product = await Product.findById(productId).populate('seller', 'name shopName shopLogo status');
    if (!product) return res.status(404).json({ message: `Product not found: ${productId}` });
    const quantity = Math.max(1, Number(item.quantity || 1));
    const unitPrice = Number(item.unit_price ?? item.unitPrice ?? product.price ?? 0);
    const totalPrice = unitPrice * quantity;
    orderItems.push({
      product: product.id,
      productSnapshot: item.product_snapshot || item.productSnapshot || product.toJSON(),
      quantity,
      unitPrice,
      totalPrice,
    });
    promoItems.push({ product, quantity, unit_price: unitPrice, total_price: totalPrice });
  }

  const subtotal = orderItems.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0);
  let discountAmount = 0;
  let promo = null;

  if (promoCode) {
    promo = await PromoCode.findOne({ code: promoCode }).populate([
      { path: 'sellers', select: 'name shopName shopLogo status' },
      { path: 'products', select: 'name image price category subcategory childCategory brand seller' },
    ]);
    if (!promo || !isPromoActive(promo)) return res.status(400).json({ message: 'Promo code is invalid or expired' });
    const usageCheck = promoMatchesUsageConditions(promo, { paymentMethod: payment_method,
    paymentDetails: { paymentType: payment_type || '', bankName: bank_name || '', cardType: card_type || '' }, paymentType: payment_type, bankName: bank_name, cardType: card_type });
    if (!usageCheck.ok) return res.status(400).json({ message: usageCheck.message });
    if (subtotal < Number(promo.minOrderAmount || 0)) {
      return res.status(400).json({ message: `Minimum order amount is ৳${Number(promo.minOrderAmount || 0).toLocaleString()}` });
    }
    const result = calculatePromoDiscount(promo, promoItems);
    if (result.discount <= 0 || result.eligibleItems.length === 0) {
      return res.status(400).json({ message: 'This promo does not apply to the selected products' });
    }
    discountAmount = result.discount;
  }

  const defaultAddress = (req.user.addresses || []).find((a) => a.isDefault) || (req.user.addresses || [])[0];
  const shippingAddress = shipping_address && Object.keys(shipping_address || {}).length
    ? shipping_address
    : defaultAddress
      ? defaultAddress.toObject ? defaultAddress.toObject() : defaultAddress
      : {};

  if (!shippingAddress?.name) shippingAddress.name = req.user.fullName || '';
  if (!shippingAddress?.phone) shippingAddress.phone = req.user.phone || '';
  if (!shippingAddress?.address) return res.status(400).json({ message: 'Delivery address is required before placing order' });

  const deliveryFee = Number(delivery_fee || 0);
  const totalAmount = Math.max(0, subtotal - discountAmount) + deliveryFee;
  const order = await Order.create({
    user: req.user.id,
    items: orderItems,
    subtotal,
    discountAmount,
    promoCode: promoCode || '',
    promo: promo?._id || null,
    deliveryFee,
    totalAmount,
    paymentMethod: payment_method,
    paymentDetails: { paymentType: payment_type || '', bankName: bank_name || '', cardType: card_type || '' },
    shippingAddress,
  });

  if (promo) {
    await PromoCode.updateOne({ _id: promo._id }, { $inc: { usedCount: 1 } });
  }

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


router.get('/reviews/my', requireUser, async (req, res) => {
  const reviews = await ProductReview.find({ user: req.user.id })
    .populate('product')
    .populate('order')
    .sort({ createdAt: -1 });
  res.json({ reviews });
});

router.post('/reviews', requireUser, async (req, res) => {
  const { orderId, orderItemId, rating, comment, photos } = req.body || {};
  if (!mongoose.isValidObjectId(orderId)) return res.status(400).json({ message: 'Valid orderId is required' });
  if (!mongoose.isValidObjectId(orderItemId)) return res.status(400).json({ message: 'Valid orderItemId is required' });
  const score = Number(rating);
  if (!Number.isFinite(score) || score < 1 || score > 5) return res.status(400).json({ message: 'Rating must be between 1 and 5' });

  const order = await Order.findOne({ _id: orderId, user: req.user.id });
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (order.status !== 'delivered') return res.status(400).json({ message: 'Only delivered products can be reviewed' });

  const item = order.items.id(orderItemId);
  if (!item) return res.status(404).json({ message: 'Ordered product not found' });
  if (item.cancellationStatus === 'cancelled') return res.status(400).json({ message: 'Cancelled products cannot be reviewed' });

  const product = await Product.findById(item.product);
  if (!product) return res.status(404).json({ message: 'Product not found' });

  const cleanPhotos = Array.isArray(photos)
    ? photos.map((url) => String(url || '').trim()).filter(Boolean).slice(0, 6)
    : [];

  const review = await ProductReview.findOneAndUpdate(
    { user: req.user._id, order: order._id, orderItem: item._id },
    {
      user: req.user._id,
      order: order._id,
      orderItem: item._id,
      product: product._id,
      rating: score,
      comment: String(comment || '').trim(),
      photos: cleanPhotos,
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  ).populate('user', 'fullName email profilePhoto');

  const stats = await ProductReview.aggregate([
    { $match: { product: product._id } },
    { $group: { _id: '$product', avg: { $avg: '$rating' }, count: { $sum: 1 } } }
  ]);
  product.rating = stats[0] ? Number(stats[0].avg.toFixed(1)) : product.rating;
  product.reviewCount = stats[0] ? stats[0].count : product.reviewCount;
  await product.save();

  res.status(201).json({ message: 'Review saved successfully', review });
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
