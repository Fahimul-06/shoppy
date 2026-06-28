import express from 'express';
import CustomerNotification from '../models/CustomerNotification.js';
import { requireUser } from '../middleware/auth.js';

const router = express.Router();

function userFilter(userId) {
  return {
    active: true,
    $or: [
      { user: userId },
      { user: null, audience: 'customers' },
    ],
  };
}

function addReadState(notification, userId) {
  const obj = notification.toJSON ? notification.toJSON() : notification;
  const id = userId.toString();
  obj.read = Array.isArray(notification.readBy) && notification.readBy.some((x) => x?.toString?.() === id);
  return obj;
}

router.get('/', requireUser, async (req, res) => {
  const notifications = await CustomerNotification.find(userFilter(req.user._id))
    .populate('order', 'orderNumber status paymentStatus')
    .populate('promo', 'code discountType discountValue expiresAt')
    .sort({ createdAt: -1 })
    .limit(100);
  res.json({ notifications: notifications.map((item) => addReadState(item, req.user._id)) });
});

router.get('/unread-count', requireUser, async (req, res) => {
  const count = await CustomerNotification.countDocuments({
    ...userFilter(req.user._id),
    readBy: { $ne: req.user._id },
  });
  res.json({ count });
});

router.patch('/:id/read', requireUser, async (req, res) => {
  const notification = await CustomerNotification.findOneAndUpdate(
    { _id: req.params.id, ...userFilter(req.user._id) },
    { $addToSet: { readBy: req.user._id } },
    { new: true }
  );
  if (!notification) return res.status(404).json({ message: 'Notification not found' });
  res.json({ notification: addReadState(notification, req.user._id) });
});

router.post('/mark-all-read', requireUser, async (req, res) => {
  await CustomerNotification.updateMany(userFilter(req.user._id), { $addToSet: { readBy: req.user._id } });
  res.json({ ok: true });
});

export default router;
