import express from 'express';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
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
export default router;
