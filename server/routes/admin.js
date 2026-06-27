import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Seller from '../models/Seller.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import PromoCode from '../models/PromoCode.js';
import ReturnRequest from '../models/ReturnRequest.js';
import CancellationRequest from '../models/CancellationRequest.js';
import ChatMessage from '../models/ChatMessage.js';
import CustomerCareMessage from '../models/CustomerCareMessage.js';
import { requireAdmin, signToken } from '../middleware/auth.js';
const router = express.Router();
const adminUser = (u) => ({ id: u.id, fullName: u.fullName, email: u.email, phone: u.phone, role: u.role });

const safeNumber = (value) => Number(value || 0);

async function getSellerAnalytics(sellerId) {
  const products = await Product.find({ seller: sellerId }).sort({ createdAt: -1 });
  const productIds = products.map((p) => p._id);
  const productIdSet = new Set(productIds.map((id) => id.toString()));

  const orders = productIds.length
    ? await Order.find({ 'items.product': { $in: productIds } }).populate('user').populate('items.product').sort({ createdAt: -1 })
    : [];

  let productsSold = 0;
  let totalSale = 0;
  const sellerOrders = [];

  for (const order of orders) {
    const sellerItems = [];
    for (const item of order.items || []) {
      const productId = item.product?._id?.toString?.() || item.product?.toString?.();
      if (!productIdSet.has(productId)) continue;
      if (item.cancellationStatus === 'cancelled') continue;
      productsSold += safeNumber(item.quantity);
      totalSale += safeNumber(item.totalPrice);
      sellerItems.push(item);
    }
    if (sellerItems.length) sellerOrders.push({ order, items: sellerItems });
  }

  return {
    products,
    orders: sellerOrders,
    stats: {
      totalProducts: products.length,
      activeProducts: products.filter((p) => p.active !== false).length,
      totalOrders: sellerOrders.length,
      productsSold,
      totalSale,
      stockAvailable: products.reduce((sum, p) => sum + safeNumber(p.stock), 0),
    },
  };
}

function formatCustomerSummary(user, orders) {
  const totalSpent = orders.reduce((sum, order) => sum + safeNumber(order.totalAmount), 0);
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    profilePhoto: user.profilePhoto,
    addresses: user.addresses || [],
    createdAt: user.createdAt,
    totalOrders: orders.length,
    totalSpent,
    lastOrderAt: orders[0]?.createdAt || null,
  };
}

async function ensureDefaultAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@gmail.com';
  const password = process.env.ADMIN_PASSWORD || 'Qwertyuiop09';
  let admin = await User.findOne({ email: email.toLowerCase() });
  if (!admin) admin = await User.create({ fullName: 'Admin', email, passwordHash: await bcrypt.hash(password, 10), role: 'admin' });
  if (admin.role !== 'admin') { admin.role = 'admin'; await admin.save(); }
  return admin;
}

router.post('/login', async (req, res) => {
  await ensureDefaultAdmin();
  const { email, password } = req.body;
  const user = await User.findOne({ email: String(email || '').toLowerCase(), role: 'admin' });
  if (!user || !(await bcrypt.compare(password || '', user.passwordHash))) return res.status(401).json({ message: 'Invalid admin credentials' });
  res.json({ token: signToken({ id: user.id, role: 'admin' }), user: adminUser(user) });
});
router.get('/me', requireAdmin, (req, res) => res.json({ user: adminUser(req.user) }));
router.get('/stats', requireAdmin, async (_req, res) => {
  const [totalSellers, pendingSellers, totalProducts, totalOrders, activePromos, paidOrders] = await Promise.all([
    Seller.countDocuments(), Seller.countDocuments({ status: 'pending' }), Product.countDocuments(), Order.countDocuments(), PromoCode.countDocuments({ active: true }), Order.find({ paymentStatus: 'paid' }),
  ]);
  res.json({ stats: { totalSellers, pendingSellers, totalProducts, totalOrders, activePromos, revenue: paidOrders.reduce((s, o) => s + Number(o.totalAmount || 0), 0) } });
});

router.get('/notification-counts', requireAdmin, async (_req, res) => {
  const [orders, returns, cancellations] = await Promise.all([
    Order.countDocuments({ status: { $in: ['pending', 'processing'] } }),
    ReturnRequest.countDocuments({ status: 'requested' }),
    CancellationRequest.countDocuments({ status: 'cancelled' }),
  ]);
  res.json({ counts: { orders, returns, cancellations } });
});

router.get('/sellers', requireAdmin, async (_req, res) => {
  const sellers = await Seller.find().sort({ createdAt: -1 });
  res.json({ sellers });
});

router.get('/sellers/:id/detail', requireAdmin, async (req, res) => {
  const seller = await Seller.findById(req.params.id);
  if (!seller) return res.status(404).json({ message: 'Seller not found' });

  const { products, orders, stats } = await getSellerAnalytics(seller._id);
  const returns = await ReturnRequest.find({ seller: seller._id }).populate('user').populate('product').populate('order').sort({ createdAt: -1 });
  const cancellations = await CancellationRequest.find({ seller: seller._id }).populate('user').populate('product').populate('order').sort({ createdAt: -1 });

  res.json({ seller, stats, products, orders, returns, cancellations });
});

router.get('/customers', requireAdmin, async (_req, res) => {
  const users = await User.find({ role: { $in: ['user', 'customer'] } }).sort({ createdAt: -1 });
  const customers = await Promise.all(users.map(async (user) => {
    const orders = await Order.find({ user: user._id }).sort({ createdAt: -1 });
    return formatCustomerSummary(user, orders);
  }));
  res.json({ customers });
});

router.get('/customers/:id/detail', requireAdmin, async (req, res) => {
  const customer = await User.findOne({ _id: req.params.id, role: { $in: ['user', 'customer'] } });
  if (!customer) return res.status(404).json({ message: 'Customer not found' });
  const [orders, returns, cancellations] = await Promise.all([
    Order.find({ user: customer._id }).populate('items.product').sort({ createdAt: -1 }),
    ReturnRequest.find({ user: customer._id }).populate('seller').populate('product').populate('order').sort({ createdAt: -1 }),
    CancellationRequest.find({ user: customer._id }).populate('seller').populate('product').populate('order').sort({ createdAt: -1 }),
  ]);
  res.json({ customer: formatCustomerSummary(customer, orders), orders, returns, cancellations });
});
router.patch('/sellers/:id/status', requireAdmin, async (req, res) => {
  const seller = await Seller.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
  res.json({ seller });
});
router.get('/products', requireAdmin, async (_req, res) => res.json({ products: await Product.find().sort({ createdAt: -1 }).populate('seller') }));
router.post('/products', requireAdmin, async (req, res) => res.status(201).json({ product: await Product.create(req.body) }));
router.put('/products/:id', requireAdmin, async (req, res) => res.json({ product: await Product.findByIdAndUpdate(req.params.id, req.body, { new: true }) }));
router.delete('/products/:id', requireAdmin, async (req, res) => { await Product.findByIdAndDelete(req.params.id); res.json({ ok: true }); });
router.get('/orders', requireAdmin, async (_req, res) => {
  const orders = await Order.find()
    .populate('user')
    .populate('items.product')
    .sort({ createdAt: -1 });
  res.json({ orders });
});
router.patch('/orders/:id', requireAdmin, async (req, res) => res.json({ order: await Order.findByIdAndUpdate(req.params.id, req.body, { new: true }) }));

router.get('/cancellations', requireAdmin, async (_req, res) => {
  const cancellations = await CancellationRequest.find()
    .populate('user')
    .populate('seller')
    .populate('product')
    .populate('order')
    .sort({ createdAt: -1 });
  res.json({ cancellations });
});

router.get('/returns', requireAdmin, async (_req, res) => {
  const returns = await ReturnRequest.find()
    .populate('user')
    .populate('seller')
    .populate('product')
    .populate('order')
    .sort({ createdAt: -1 });
  res.json({ returns });
});

router.patch('/returns/:id', requireAdmin, async (req, res) => {
  const { status, adminNote } = req.body || {};
  const allowed = ['requested', 'approved', 'denied', 'received', 'refunded', 'cancelled'];
  if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid return status' });

  const update = { status, adminNote: adminNote || '' };
  if (['approved', 'denied'].includes(status)) update.decidedAt = new Date();
  if (status === 'approved') update.approvedAt = new Date();
  if (status === 'denied') update.deniedAt = new Date();

  const returnRequest = await ReturnRequest.findByIdAndUpdate(req.params.id, update, { new: true })
    .populate('user')
    .populate('seller')
    .populate('product')
    .populate('order');
  if (!returnRequest) return res.status(404).json({ message: 'Return request not found' });
  res.json({ message: 'Return request updated', returnRequest });
});


router.get('/messages', requireAdmin, async (_req, res) => {
  const messages = await ChatMessage.find()
    .populate({ path: 'seller', select: 'name shopName shopLogo email phone' })
    .populate({ path: 'customer', select: 'fullName name email phone profilePhoto' })
    .populate({ path: 'product', select: 'name image images' })
    .populate({ path: 'order', select: 'orderNumber status paymentStatus createdAt' })
    .sort({ createdAt: -1 });

  const groups = new Map();
  for (const message of messages) {
    const key = `${message.order?._id || message.order}-${message.orderItem}-${message.seller?._id || message.seller}-${message.customer?._id || message.customer}`;
    if (!groups.has(key)) {
      groups.set(key, {
        id: key,
        order: message.order,
        orderItem: message.orderItem,
        seller: message.seller,
        customer: message.customer,
        product: message.product,
        lastMessage: message,
        messageCount: 0,
        unreadForSeller: 0,
        unreadForCustomer: 0,
      });
    }
    const group = groups.get(key);
    group.messageCount += 1;
    if (!message.readBySeller) group.unreadForSeller += 1;
    if (!message.readByCustomer) group.unreadForCustomer += 1;
  }

  res.json({ conversations: Array.from(groups.values()) });
});

router.get('/messages/:orderId/:orderItemId', requireAdmin, async (req, res) => {
  const { orderId, orderItemId } = req.params;
  const messages = await ChatMessage.find({ order: orderId, orderItem: orderItemId })
    .populate({ path: 'seller', select: 'name shopName shopLogo email phone' })
    .populate({ path: 'customer', select: 'fullName name email phone profilePhoto' })
    .populate({ path: 'product', select: 'name image images' })
    .populate({ path: 'order', select: 'orderNumber status paymentStatus createdAt' })
    .sort({ createdAt: 1 });
  res.json({ messages });
});


router.get('/customer-care', requireAdmin, async (_req, res) => {
  const messages = await CustomerCareMessage.find()
    .populate({ path: 'customer', select: 'fullName name email phone profilePhoto' })
    .sort({ createdAt: -1 });

  const groups = new Map();
  for (const message of messages) {
    const customerId = message.customer?._id?.toString?.() || message.customer?.toString?.();
    if (!customerId) continue;
    if (!groups.has(customerId)) {
      groups.set(customerId, {
        id: customerId,
        customer: message.customer,
        lastMessage: message,
        messageCount: 0,
        unreadForAdmin: 0,
      });
    }
    const group = groups.get(customerId);
    group.messageCount += 1;
    if (!message.readByAdmin && message.senderType === 'customer') group.unreadForAdmin += 1;
  }

  res.json({ conversations: Array.from(groups.values()) });
});

router.get('/customer-care/:customerId', requireAdmin, async (req, res) => {
  const customerId = req.params.customerId;
  const customer = await User.findById(customerId).select('fullName name email phone profilePhoto role');
  if (!customer) return res.status(404).json({ message: 'Customer not found' });
  await CustomerCareMessage.updateMany(
    { customer: customerId, senderType: 'customer', readByAdmin: false },
    { readByAdmin: true }
  );
  const messages = await CustomerCareMessage.find({ customer: customerId }).sort({ createdAt: 1 });
  res.json({ customer, messages });
});

router.post('/customer-care/:customerId', requireAdmin, async (req, res) => {
  const customerId = req.params.customerId;
  const text = String(req.body?.message || '').trim();
  if (!text) return res.status(400).json({ message: 'Message is required' });
  const customer = await User.findById(customerId).select('_id');
  if (!customer) return res.status(404).json({ message: 'Customer not found' });
  const chatMessage = await CustomerCareMessage.create({
    customer: customer._id,
    senderType: 'admin',
    sender: req.user._id,
    message: text,
    readByCustomer: false,
    readByAdmin: true,
  });
  res.status(201).json({ message: chatMessage });
});

router.get('/promos', requireAdmin, async (_req, res) => res.json({ promos: await PromoCode.find().sort({ createdAt: -1 }) }));
router.post('/promos', requireAdmin, async (req, res) => res.status(201).json({ promo: await PromoCode.create(req.body) }));
router.put('/promos/:id', requireAdmin, async (req, res) => res.json({ promo: await PromoCode.findByIdAndUpdate(req.params.id, req.body, { new: true }) }));
router.delete('/promos/:id', requireAdmin, async (req, res) => { await PromoCode.findByIdAndDelete(req.params.id); res.json({ ok: true }); });
router.put('/settings', requireAdmin, async (req, res) => {
  const { fullName, email, password } = req.body;
  if (fullName !== undefined) req.user.fullName = fullName;
  if (email) req.user.email = email;
  if (password) req.user.passwordHash = await bcrypt.hash(password, 10);
  await req.user.save();
  res.json({ user: adminUser(req.user) });
});
export default router;
