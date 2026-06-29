import 'dotenv/config';
import express from 'express';
import http from 'http';
import jwt from 'jsonwebtoken';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { connectDB } from './models/index.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import categoryRoutes from './routes/categories.js';
import heroRoutes from './routes/heroSlides.js';
import orderRoutes from './routes/orders.js';
import adminRoutes from './routes/admin.js';
import sellerRoutes from './routes/seller.js';
import wishlistRoutes from './routes/wishlist.js';
import uploadRoutes from './routes/uploads.js';
import promoRoutes from './routes/promos.js';
import supportRoutes from './routes/support.js';
import notificationRoutes from './routes/notifications.js';
import shopRoutes from './routes/shops.js';
import settingsRoutes from './routes/settings.js';
import deliveryRoutes from './routes/delivery.js';
import callRoutes from './routes/calls.js';
import User from './models/User.js';
import DeliverySupportMessage from './models/DeliverySupportMessage.js';
import InternetCallRoom from './models/InternetCallRoom.js';
import { hasAdminPermission } from './middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: process.env.CLIENT_URL?.split(',') || true, credentials: true },
  transports: ['websocket', 'polling'],
});
app.set('io', io);
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
});
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});



async function authenticateSocket(socket, next) {
  try {
    const token = String(socket.handshake.auth?.token || '').replace('Bearer ', '');
    const expectedRole = String(socket.handshake.auth?.role || '');
    if (!token) return next(new Error('Login required'));
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    const user = await User.findById(decoded.id);
    if (!user) return next(new Error('Invalid login'));
    if (expectedRole && expectedRole !== user.role && !(expectedRole === 'admin' && user.role === 'admin')) {
      return next(new Error('Invalid role'));
    }
    socket.user = user;
    next();
  } catch (error) {
    next(new Error('Invalid socket token'));
  }
}

app.use(cors({ origin: process.env.CLIENT_URL?.split(',') || true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/hero-slides', heroRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/seller', sellerRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/promos', promoRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/settings', settingsRoutes);

app.use('/api/calls', callRoutes);
app.use('/api/delivery', deliveryRoutes);


app.use((err, _req, res, _next) => {
  console.error('API error:', err);
  if (res.headersSent) return;
  res.status(err.status || 500).json({
    message: err.message || 'Server error. Please check backend logs.',
  });
});

const possibleClientDistPaths = [
  path.join(process.cwd(), 'dist'),
  path.join(__dirname, '..', 'dist'),
  path.join(__dirname, '..', '..', 'dist'),
];

const clientDist = possibleClientDistPaths.find((distPath) =>
  fs.existsSync(path.join(distPath, 'index.html'))
);

if (clientDist) {
  console.log('Serving frontend from:', clientDist);
  app.use(express.static(clientDist));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
} else {
  console.warn('Frontend build not found. Checked:', possibleClientDistPaths);

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.status(500).send('Frontend build not found. Run npm run build before starting the server.');
  });
}


io.use(authenticateSocket);

async function canJoinCallRoom(user, roomId) {
  const room = await InternetCallRoom.findOne({ roomId }).populate('deliveryMan', 'fullName phone deliveryCode role');
  if (!room) return { allowed: false };
  let role = '';
  if (user.role === 'delivery' && String(room.deliveryMan?._id || room.deliveryMan) === String(user._id)) role = 'delivery';
  if (user.role === 'admin' && user.adminStatus !== 'inactive' && hasAdminPermission(user, 'customerCare')) role = 'admin';
  return { allowed: Boolean(role), role, room };
}

io.on('connection', (socket) => {
  const user = socket.user;
  if (!user) return;

  if (user.role === 'admin' && user.adminStatus !== 'inactive' && hasAdminPermission(user, 'customerCare')) {
    socket.join('admin:delivery-support');
  }
  if (user.role === 'delivery') {
    socket.join(`delivery:${user._id}:support`);
    socket.join(`delivery:${user._id}:orders`);
  }

  socket.on('delivery-support:join', async ({ deliveryManId } = {}) => {
    if (user.role === 'admin' && hasAdminPermission(user, 'customerCare') && deliveryManId) {
      socket.join(`delivery:${deliveryManId}:support`);
    }
    if (user.role === 'delivery') {
      socket.join(`delivery:${user._id}:support`);
    }
  });

  socket.on('delivery-support:message', async ({ message = '', language = 'bn' } = {}, ack) => {
    try {
      if (user.role !== 'delivery') throw new Error('Delivery login required');
      const text = String(message || '').trim();
      if (!text) throw new Error('Message is required');
      const created = await DeliverySupportMessage.create({
        deliveryMan: user._id,
        senderType: 'delivery',
        sender: user._id,
        message: text,
        language: String(language || 'bn').trim() || 'bn',
        readByAdmin: false,
        readByDelivery: true,
      });
      io.to(`delivery:${user._id}:support`).emit('delivery-support:message', created);
      io.to('admin:delivery-support').emit('delivery-support:message', created);
      io.to('admin:delivery-support').emit('delivery-support:refresh');
      ack?.({ ok: true, message: created });
    } catch (error) {
      ack?.({ ok: false, message: error.message || 'Message failed' });
    }
  });

  socket.on('delivery-support:admin-message', async ({ deliveryManId = '', message = '', language = 'bn' } = {}, ack) => {
    try {
      if (user.role !== 'admin' || !hasAdminPermission(user, 'customerCare')) throw new Error('Customer care access required');
      const text = String(message || '').trim();
      if (!text) throw new Error('Message is required');
      const deliveryMan = await User.findOne({ _id: deliveryManId, role: 'delivery' });
      if (!deliveryMan) throw new Error('Delivery man not found');
      const created = await DeliverySupportMessage.create({
        deliveryMan: deliveryMan._id,
        senderType: 'admin',
        sender: user._id,
        message: text,
        language: String(language || 'bn').trim() || 'bn',
        readByAdmin: true,
        readByDelivery: false,
      });
      io.to(`delivery:${deliveryMan._id}:support`).emit('delivery-support:message', created);
      io.to('admin:delivery-support').emit('delivery-support:message', created);
      io.to('admin:delivery-support').emit('delivery-support:refresh');
      ack?.({ ok: true, message: created });
    } catch (error) {
      ack?.({ ok: false, message: error.message || 'Reply failed' });
    }
  });

  socket.on('call:join', async ({ roomId } = {}, ack) => {
    try {
      const check = await canJoinCallRoom(user, String(roomId || ''));
      if (!check.allowed) throw new Error('You cannot join this call room');
      socket.join(`call:${roomId}`);
      socket.callRoomId = roomId;
      socket.callRole = check.role;
      const patch = check.role === 'delivery'
        ? { deliveryJoinedAt: new Date() }
        : { adminJoinedAt: new Date(), status: 'joined' };
      const room = await InternetCallRoom.findOneAndUpdate({ roomId }, { $set: patch }, { new: true }).populate('deliveryMan', 'fullName phone deliveryCode role');
      if (room?.supportMessage) await DeliverySupportMessage.findByIdAndUpdate(room.supportMessage, { $set: { callStatus: room.status } });
      io.to(`call:${roomId}`).emit('call:room', { room, role: check.role });
      io.to('admin:delivery-support').emit('delivery-support:refresh');
      ack?.({ ok: true, room, role: check.role });
    } catch (error) {
      ack?.({ ok: false, message: error.message || 'Call join failed' });
    }
  });

  socket.on('call:signal', async ({ roomId = '', type = '', payload = {} } = {}, ack) => {
    try {
      const check = await canJoinCallRoom(user, String(roomId));
      if (!check.allowed) throw new Error('You cannot signal this call');
      if (!['offer', 'answer', 'candidate', 'leave'].includes(type)) throw new Error('Invalid signal type');
      const signal = { from: check.role, to: check.role === 'delivery' ? 'admin' : 'delivery', type, payload };
      await InternetCallRoom.findOneAndUpdate({ roomId }, { $push: { signals: signal } });
      socket.to(`call:${roomId}`).emit('call:signal', signal);
      ack?.({ ok: true, signal });
    } catch (error) {
      ack?.({ ok: false, message: error.message || 'Signal failed' });
    }
  });

  async function endSocketCall(roomId, reason = 'ended') {
    const check = await canJoinCallRoom(user, String(roomId || ''));
    if (!check.allowed) return;
    const room = await InternetCallRoom.findOneAndUpdate(
      { roomId },
      { $set: { status: 'ended', endedAt: new Date() } },
      { new: true }
    );
    if (room?.supportMessage) await DeliverySupportMessage.findByIdAndUpdate(room.supportMessage, { $set: { callStatus: 'ended' } });
    io.to(`call:${roomId}`).emit('call:ended', { roomId, reason, endedBy: check.role });
    io.to('admin:delivery-support').emit('delivery-support:refresh');
  }

  socket.on('call:end', async ({ roomId } = {}, ack) => {
    try {
      await endSocketCall(roomId, 'ended');
      ack?.({ ok: true });
    } catch (error) {
      ack?.({ ok: false, message: error.message || 'End call failed' });
    }
  });

  socket.on('disconnect', () => {
    if (socket.callRoomId) {
      endSocketCall(socket.callRoomId, 'left-page').catch(() => {});
    }
  });
});

connectDB().then(() => {
  server.listen(PORT, () => console.log(`API running on port ${PORT}`));
}).catch((err) => {
  console.error('MongoDB connection failed:', err.message);
  process.exit(1);
});
