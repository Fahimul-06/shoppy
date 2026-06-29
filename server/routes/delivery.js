import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Order from '../models/Order.js';
import { requireDeliveryMan, signToken } from '../middleware/auth.js';

const router = express.Router();

const deliveryUser = (u) => ({
  id: u.id,
  fullName: u.fullName,
  phone: u.phone,
  nid: u.nid || '',
  role: 'delivery',
});

const safeOrder = (order) => ({
  id: order.id,
  orderNumber: order.orderNumber,
  status: order.status,
  paymentStatus: order.paymentStatus,
  paymentMethod: order.paymentMethod,
  totalAmount: order.totalAmount,
  deliveryFee: order.deliveryFee,
  shippingAddress: order.shippingAddress || {},
  customer: order.user ? {
    fullName: order.user.fullName,
    phone: order.user.phone,
    email: order.user.email,
  } : null,
  items: (order.items || []).map((item) => ({
    id: item.id,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    totalPrice: item.totalPrice,
    product: item.productSnapshot || item.product || {},
  })),
  createdAt: order.createdAt,
  assignedToDeliveryAt: order.assignedToDeliveryAt,
});

router.post('/login', async (req, res) => {
  const phone = String(req.body?.phone || '').trim();
  const password = String(req.body?.password || '');
  const user = await User.findOne({ role: 'delivery', phone });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ message: 'Invalid delivery man credentials' });
  }
  res.json({ token: signToken({ id: user.id, role: 'delivery' }), user: deliveryUser(user) });
});

router.get('/me', requireDeliveryMan, (req, res) => {
  res.json({ user: deliveryUser(req.deliveryMan) });
});

router.get('/orders', requireDeliveryMan, async (req, res) => {
  const orders = await Order.find({ deliveryMan: req.deliveryMan._id })
    .populate('user')
    .populate('items.product')
    .sort({ assignedToDeliveryAt: -1, createdAt: -1 });
  res.json({ orders: orders.map(safeOrder) });
});

router.patch('/orders/:id/status', requireDeliveryMan, async (req, res) => {
  const status = String(req.body?.status || '').trim();
  if (!['shipped', 'delivered'].includes(status)) return res.status(400).json({ message: 'Delivery man can only mark shipped or delivered' });
  const order = await Order.findOneAndUpdate(
    { _id: req.params.id, deliveryMan: req.deliveryMan._id },
    { $set: { status } },
    { new: true }
  ).populate('user').populate('items.product');
  if (!order) return res.status(404).json({ message: 'Assigned order not found' });
  res.json({ order: safeOrder(order) });
});

export default router;
