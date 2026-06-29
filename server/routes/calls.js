import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import InternetCallRoom from '../models/InternetCallRoom.js';
import DeliverySupportMessage from '../models/DeliverySupportMessage.js';
import { hasAdminPermission } from '../middleware/auth.js';

const router = express.Router();

async function requireCallParticipant(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Call login required' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: 'Invalid call session' });

    const room = await InternetCallRoom.findOne({ roomId: req.params.roomId }).populate('deliveryMan', 'fullName phone deliveryCode role');
    if (!room) return res.status(404).json({ message: 'Call room not found' });

    let participantRole = '';
    if (user.role === 'delivery' && String(room.deliveryMan?._id || room.deliveryMan) === String(user._id)) {
      participantRole = 'delivery';
    } else if (user.role === 'admin' && user.adminStatus !== 'inactive' && hasAdminPermission(user, 'customerCare')) {
      participantRole = 'admin';
    }

    if (!participantRole) return res.status(403).json({ message: 'You cannot join this call room' });
    req.callUser = user;
    req.callRole = participantRole;
    req.callRoom = room;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid call token' });
  }
}

const publicRoomPayload = (room, role) => ({
  roomId: room.roomId,
  status: room.status,
  role,
  peerRole: role === 'delivery' ? 'admin' : 'delivery',
  deliveryMan: room.deliveryMan,
  deliveryJoinedAt: room.deliveryJoinedAt,
  adminJoinedAt: room.adminJoinedAt,
});

router.get('/:roomId', requireCallParticipant, (req, res) => {
  res.json({ room: publicRoomPayload(req.callRoom, req.callRole) });
});

router.post('/:roomId/join', requireCallParticipant, async (req, res) => {
  const patch = req.callRole === 'delivery'
    ? { deliveryJoinedAt: new Date() }
    : { adminJoinedAt: new Date(), status: 'joined' };

  const room = await InternetCallRoom.findOneAndUpdate(
    { roomId: req.params.roomId },
    { $set: patch },
    { new: true }
  ).populate('deliveryMan', 'fullName phone deliveryCode role');

  if (room.supportMessage) {
    await DeliverySupportMessage.findByIdAndUpdate(room.supportMessage, {
      $set: { callStatus: room.status, readByAdmin: req.callRole === 'admin' ? true : undefined },
    });
  }

  res.json({ room: publicRoomPayload(room, req.callRole) });
});

router.get('/:roomId/signals', requireCallParticipant, async (req, res) => {
  const seen = String(req.query.seen || '').split(',').filter(Boolean);
  const seenSet = new Set(seen);
  const signals = (req.callRoom.signals || [])
    .filter((signal) => signal.to === req.callRole && !seenSet.has(String(signal._id)))
    .map((signal) => ({
      id: String(signal._id),
      from: signal.from,
      to: signal.to,
      type: signal.type,
      payload: signal.payload,
      createdAt: signal.createdAt,
    }));
  res.json({ signals, room: publicRoomPayload(req.callRoom, req.callRole) });
});

router.post('/:roomId/signals', requireCallParticipant, async (req, res) => {
  const type = String(req.body?.type || '').trim();
  if (!['offer', 'answer', 'candidate', 'leave'].includes(type)) {
    return res.status(400).json({ message: 'Invalid signal type' });
  }
  const signal = {
    from: req.callRole,
    to: req.callRole === 'delivery' ? 'admin' : 'delivery',
    type,
    payload: req.body?.payload || {},
  };
  const room = await InternetCallRoom.findOneAndUpdate(
    { roomId: req.params.roomId },
    { $push: { signals: signal } },
    { new: true }
  );
  res.status(201).json({ ok: true, signal: room.signals[room.signals.length - 1] });
});

router.patch('/:roomId/status', requireCallParticipant, async (req, res) => {
  const status = String(req.body?.status || '').trim();
  if (!['joined', 'ended', 'missed'].includes(status)) return res.status(400).json({ message: 'Invalid call status' });
  const room = await InternetCallRoom.findOneAndUpdate(
    { roomId: req.params.roomId },
    { $set: { status, endedAt: status === 'ended' ? new Date() : undefined } },
    { new: true }
  ).populate('deliveryMan', 'fullName phone deliveryCode role');

  if (room.supportMessage) {
    await DeliverySupportMessage.findByIdAndUpdate(room.supportMessage, { $set: { callStatus: status } });
  }
  const io = req.app.get('io');
  io?.to(`call:${req.params.roomId}`).emit(status === 'ended' ? 'call:ended' : 'call:room', { room, roomId: req.params.roomId, reason: status, endedBy: req.callRole });
  io?.to('admin:delivery-support').emit('delivery-support:refresh');
  res.json({ room: publicRoomPayload(room, req.callRole) });
});

export default router;
