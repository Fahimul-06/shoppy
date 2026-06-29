import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Order from '../models/Order.js';
import DeliverySupportMessage from '../models/DeliverySupportMessage.js';
import InternetCallRoom from '../models/InternetCallRoom.js';
import { requireDeliveryMan, signToken } from '../middleware/auth.js';
import { resolvePaymentStatus } from '../utils/payment.js';

const router = express.Router();

const deliveryUser = (u) => ({
  id: u.id,
  fullName: u.fullName,
  phone: u.phone,
  nid: u.nid || '',
  deliveryCode: u.deliveryCode || '',
  deliveryBarcode: u.deliveryBarcode || '',
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
  itemCount: (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0),
  createdAt: order.createdAt,
  assignedToDeliveryAt: order.assignedToDeliveryAt,
});

router.post('/login', async (req, res) => {
  const loginId = String(req.body?.loginId || req.body?.deliveryCode || req.body?.idNumber || req.body?.phone || '').trim();
  const password = String(req.body?.password || '');
  const query = /^\d{6}$/.test(loginId)
    ? { role: 'delivery', deliveryCode: loginId }
    : { role: 'delivery', phone: loginId };
  const user = await User.findOne(query);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ message: 'Invalid delivery ID or password' });
  }
  res.json({ token: signToken({ id: user.id, role: 'delivery' }), user: deliveryUser(user) });
});

router.get('/me', requireDeliveryMan, (req, res) => {
  res.json({ user: deliveryUser(req.deliveryMan) });
});

router.get('/orders', requireDeliveryMan, async (req, res) => {
  const orders = await Order.find({ deliveryMan: req.deliveryMan._id, status: { $in: ['shipped', 'delivered'] } })
    .populate('user')
    .sort({ assignedToDeliveryAt: -1, createdAt: -1 });
  res.json({ orders: orders.map(safeOrder) });
});

router.patch('/orders/:id/status', requireDeliveryMan, async (req, res) => {
  const status = String(req.body?.status || '').trim();
  if (status !== 'delivered') return res.status(400).json({ message: 'Delivery man can only mark delivered' });
  const existing = await Order.findOne({ _id: req.params.id, deliveryMan: req.deliveryMan._id, status: 'shipped' });
  if (!existing) return res.status(404).json({ message: 'Shipped assigned order not found' });
  const update = { status: 'delivered' };
  update.paymentStatus = resolvePaymentStatus({
    paymentMethod: existing.paymentMethod,
    paymentDetails: existing.paymentDetails || {},
    status: 'delivered',
    currentPaymentStatus: existing.paymentStatus,
  });
  const order = await Order.findOneAndUpdate(
    { _id: req.params.id, deliveryMan: req.deliveryMan._id },
    { $set: update },
    { new: true }
  ).populate('user');
  res.json({ order: safeOrder(order) });
});

router.get('/support', requireDeliveryMan, async (req, res) => {
  await DeliverySupportMessage.updateMany(
    { deliveryMan: req.deliveryMan._id, senderType: 'admin', readByDelivery: false },
    { readByDelivery: true }
  );
  const messages = await DeliverySupportMessage.find({ deliveryMan: req.deliveryMan._id }).sort({ createdAt: 1 });
  res.json({ messages });
});


router.post('/support/call', requireDeliveryMan, async (req, res) => {
  const deliveryCode = req.deliveryMan.deliveryCode || String(req.deliveryMan._id).slice(-6);
  const roomName = `shoppy-delivery-${deliveryCode}-${Date.now()}`.replace(/[^a-zA-Z0-9-]/g, '');
  const callUrl = `/call/${roomName}`;
  const message = await DeliverySupportMessage.create({
    deliveryMan: req.deliveryMan._id,
    senderType: 'delivery',
    sender: req.deliveryMan._id,
    message: 'ডেলিভারি ম্যান ইন্টারনেট কল শুরু করেছেন। Customer care can join the virtual call.',
    messageType: 'call',
    callRoomName: roomName,
    callUrl,
    callStatus: 'ringing',
    language: 'bn',
    readByAdmin: false,
    readByDelivery: true,
  });
  await InternetCallRoom.create({
    roomId: roomName,
    deliveryMan: req.deliveryMan._id,
    supportMessage: message._id,
    status: 'ringing',
  });
  res.status(201).json({ message, callUrl, roomName });
});

router.patch('/support/call/:messageId/end', requireDeliveryMan, async (req, res) => {
  const message = await DeliverySupportMessage.findOneAndUpdate(
    { _id: req.params.messageId, deliveryMan: req.deliveryMan._id, messageType: 'call' },
    { $set: { callStatus: 'ended' } },
    { new: true }
  );
  if (!message) return res.status(404).json({ message: 'Call session not found' });
  if (message.callRoomName) {
    await InternetCallRoom.findOneAndUpdate(
      { roomId: message.callRoomName },
      { $set: { status: 'ended', endedAt: new Date() } }
    );
  }
  res.json({ message });
});

router.post('/support', requireDeliveryMan, async (req, res) => {
  const text = String(req.body?.message || '').trim();
  if (!text) return res.status(400).json({ message: 'Message is required' });
  const message = await DeliverySupportMessage.create({
    deliveryMan: req.deliveryMan._id,
    senderType: 'delivery',
    sender: req.deliveryMan._id,
    message: text,
    language: String(req.body?.language || 'bn').trim() || 'bn',
    readByAdmin: false,
    readByDelivery: true,
  });
  res.status(201).json({ message });
});

export default router;
