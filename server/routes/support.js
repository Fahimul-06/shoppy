import express from 'express';
import CustomerCareMessage from '../models/CustomerCareMessage.js';
import { requireUser } from '../middleware/auth.js';

const router = express.Router();

router.get('/messages', requireUser, async (req, res) => {
  await CustomerCareMessage.updateMany(
    { customer: req.user._id, senderType: 'admin', readByCustomer: false },
    { readByCustomer: true }
  );
  const messages = await CustomerCareMessage.find({ customer: req.user._id })
    .sort({ createdAt: 1 });
  const unreadAdminReplies = await CustomerCareMessage.countDocuments({
    customer: req.user._id,
    senderType: 'admin',
    readByCustomer: false,
  });
  res.json({ messages, unreadAdminReplies });
});

router.post('/messages', requireUser, async (req, res) => {
  const text = String(req.body?.message || '').trim();
  if (!text) return res.status(400).json({ message: 'Message is required' });
  const chatMessage = await CustomerCareMessage.create({
    customer: req.user._id,
    senderType: 'customer',
    sender: req.user._id,
    message: text,
    readByCustomer: true,
    readByAdmin: false,
  });
  res.status(201).json({ message: chatMessage });
});

router.get('/unread-count', requireUser, async (req, res) => {
  const count = await CustomerCareMessage.countDocuments({
    customer: req.user._id,
    senderType: 'admin',
    readByCustomer: false,
  });
  res.json({ count });
});

export default router;
