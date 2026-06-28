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
import CustomerNotification from '../models/CustomerNotification.js';
import HeroSlide from '../models/HeroSlide.js';
import PlatformSetting from '../models/PlatformSetting.js';
import { isPromoActive } from '../utils/promo.js';
import { requireAdmin, signToken } from '../middleware/auth.js';
import { getPlatformSettings } from './settings.js';
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



function cleanPlatformSettingsPayload(body = {}) {
  const number = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(0, n) : fallback;
  };
  const dateOrNull = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };
  return {
    deliveryCharge: number(body.deliveryCharge, 120),
    freeDeliveryMin: number(body.freeDeliveryMin, 2000),
    platformFeeType: body.platformFeeType === 'percent' ? 'percent' : 'fixed',
    platformFee: number(body.platformFee, 0),
    vatPercent: Math.min(100, number(body.vatPercent, 0)),
    flashSaleStartsAt: dateOrNull(body.flashSaleStartsAt),
    flashSaleEndsAt: dateOrNull(body.flashSaleEndsAt),
  };
}

function clampSaleDiscount(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function sanitizeSaleProductPayload(body = {}) {
  const payload = { ...body };
  if (Array.isArray(payload.saleTags)) {
    const saleTags = payload.saleTags.filter((tag) => ['daily', 'flash'].includes(tag));
    payload.saleTags = [...new Set(saleTags)];
    payload.dailySaleDiscount = payload.saleTags.includes('daily') ? clampSaleDiscount(payload.dailySaleDiscount ?? payload.discount) : 0;
    payload.flashSaleDiscount = payload.saleTags.includes('flash') ? clampSaleDiscount(payload.flashSaleDiscount ?? payload.discount) : 0;
    payload.discount = Math.max(payload.dailySaleDiscount || 0, payload.flashSaleDiscount || 0, clampSaleDiscount(payload.discount));
  } else {
    delete payload.saleTags;
    delete payload.dailySaleDiscount;
    delete payload.flashSaleDiscount;
  }
  if (payload.originalPrice === '') delete payload.originalPrice;
  return payload;
}

async function applySaleToProducts({ saleType, productIds, discount, replaceExisting = true }) {
  const tag = saleType === 'flash' ? 'flash' : 'daily';
  const discountField = tag === 'daily' ? 'dailySaleDiscount' : 'flashSaleDiscount';
  const ids = Array.isArray(productIds)
    ? productIds.map((id) => String(id || '').trim()).filter((id) => id && Product.db.base.Types.ObjectId.isValid(id))
    : [];
  const safeDiscount = clampSaleDiscount(discount);
  const result = { selectedCount: ids.length, removedCount: 0, updatedCount: 0 };

  if (replaceExisting) {
    const removePipeline = [
      {
        $set: {
          saleTags: {
            $filter: {
              input: { $ifNull: ['$saleTags', []] },
              as: 'saleTag',
              cond: { $ne: ['$$saleTag', tag] },
            },
          },
          [discountField]: 0,
        },
      },
      {
        $set: {
          discount: {
            $max: [
              { $ifNull: ['$dailySaleDiscount', 0] },
              { $ifNull: ['$flashSaleDiscount', 0] },
            ],
          },
        },
      },
    ];
    const removed = await Product.updateMany(
      { saleTags: tag, ...(ids.length ? { _id: { $nin: ids } } : {}) },
      removePipeline
    );
    result.removedCount = removed.modifiedCount || 0;
  }

  if (ids.length) {
    const applyPipeline = [
      {
        $set: {
          saleTags: { $setUnion: [{ $ifNull: ['$saleTags', []] }, [tag]] },
          [discountField]: safeDiscount,
        },
      },
      {
        $set: {
          discount: {
            $max: [
              { $ifNull: ['$dailySaleDiscount', 0] },
              { $ifNull: ['$flashSaleDiscount', 0] },
            ],
          },
        },
      },
    ];
    const updated = await Product.updateMany({ _id: { $in: ids } }, applyPipeline);
    result.updatedCount = updated.modifiedCount || updated.matchedCount || 0;
  }

  return result;
}


async function applyNewArrivals({ productIds, replaceExisting = true }) {
  const ids = Array.isArray(productIds)
    ? productIds.map((id) => String(id || '').trim()).filter((id) => id && Product.db.base.Types.ObjectId.isValid(id))
    : [];
  const result = { selectedCount: ids.length, removedCount: 0, updatedCount: 0 };

  if (replaceExisting) {
    const removed = await Product.updateMany(
      { newArrival: true, ...(ids.length ? { _id: { $nin: ids } } : {}) },
      { $set: { newArrival: false }, $unset: { badge: '' } }
    );
    result.removedCount = removed.modifiedCount || 0;
  }

  if (ids.length) {
    const updated = await Product.updateMany(
      { _id: { $in: ids } },
      { $set: { newArrival: true, badge: 'new' } }
    );
    result.updatedCount = updated.modifiedCount || updated.matchedCount || 0;
  }

  return result;
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


router.get('/platform-settings', requireAdmin, async (_req, res) => {
  const settings = await getPlatformSettings();
  res.json({ settings });
});

router.put('/platform-settings', requireAdmin, async (req, res) => {
  const payload = cleanPlatformSettingsPayload(req.body || {});
  const settings = await PlatformSetting.findOneAndUpdate(
    { key: 'default' },
    { $set: payload, $setOnInsert: { key: 'default' } },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
  );
  res.json({ settings });
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
router.post('/products', requireAdmin, async (req, res) => res.status(201).json({ product: await Product.create(sanitizeSaleProductPayload(req.body)) }));
router.put('/products/:id', requireAdmin, async (req, res) => res.json({ product: await Product.findByIdAndUpdate(req.params.id, sanitizeSaleProductPayload(req.body), { new: true }) }));
router.delete('/products/:id', requireAdmin, async (req, res) => { await Product.findByIdAndDelete(req.params.id); res.json({ ok: true }); });

router.post('/sales/apply', requireAdmin, async (req, res, next) => {
  try {
    const { saleType = 'daily', discount = 0, productIds = [], replaceExisting = true } = req.body || {};
    if (!['daily', 'flash', 'newArrival'].includes(saleType)) return res.status(400).json({ message: 'Invalid sale type' });
    if (!Array.isArray(productIds)) return res.status(400).json({ message: 'productIds must be an array' });

    if (saleType === 'newArrival') {
      const result = await applyNewArrivals({ productIds, replaceExisting });
      return res.json({ message: 'New arrival products updated', saleType, discount: 0, ...result });
    }

    const result = await applySaleToProducts({ saleType, productIds, discount, replaceExisting });
    res.json({ message: 'Sale products updated', saleType, discount: clampSaleDiscount(discount), ...result });
  } catch (error) {
    next(error);
  }
});
router.get('/orders', requireAdmin, async (_req, res) => {
  const orders = await Order.find()
    .populate('user')
    .populate('items.product')
    .sort({ createdAt: -1 });
  res.json({ orders });
});
router.patch('/orders/:id', requireAdmin, async (req, res) => {
  const existing = await Order.findById(req.params.id).populate('user');
  if (!existing) return res.status(404).json({ message: 'Order not found' });
  const previousStatus = existing.status;
  const order = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('user');

  if (req.body?.status && req.body.status !== previousStatus && ['processing', 'shipped', 'delivered'].includes(req.body.status)) {
    const typeMap = {
      processing: 'order_processing',
      shipped: 'order_shipped',
      delivered: 'order_delivered',
    };
    const titleMap = {
      processing: 'Your order is processing',
      shipped: 'Your order has shipped',
      delivered: 'Your order has been delivered',
    };
    await CustomerNotification.create({
      user: order.user?._id || order.user,
      audience: 'customer',
      type: typeMap[req.body.status],
      title: titleMap[req.body.status],
      message: `Order ${order.orderNumber || ''} is now ${req.body.status}.`,
      link: '/orders',
      order: order._id,
    });
  }

  res.json({ order });
});

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

function normalizePromoPayload(body = {}) {
  const arrayOfStrings = (value) => Array.isArray(value) ? value.map((x) => String(x || '').trim()).filter(Boolean) : [];
  const arrayOfIds = (value) => Array.isArray(value) ? value.map((x) => String(x || '').trim()).filter(Boolean) : [];
  return {
    code: String(body.code || '').trim().toUpperCase(),
    description: String(body.description || '').trim(),
    image: String(body.image || '').trim(),
    discountType: body.discountType === 'fixed' ? 'fixed' : 'percentage',
    discountValue: Number(body.discountValue || 0),
    minOrderAmount: Number(body.minOrderAmount || 0),
    maxDiscountAmount: Number(body.maxDiscountAmount || 0),
    maxUses: body.maxUses === '' || body.maxUses == null ? undefined : Number(body.maxUses),
    appliesTo: body.appliesTo || 'all',
    categories: arrayOfStrings(body.categories),
    subcategories: arrayOfStrings(body.subcategories),
    childCategories: arrayOfStrings(body.childCategories),
    brands: arrayOfStrings(body.brands),
    sellers: arrayOfIds(body.sellers),
    products: arrayOfIds(body.products),
    voucherType: ['general', 'payment_type', 'payment_method', 'bank_card', 'weekend_deal', 'store_usage'].includes(body.voucherType) ? body.voucherType : 'general',
    paymentTypes: arrayOfStrings(body.paymentTypes),
    paymentMethods: arrayOfStrings(body.paymentMethods),
    banks: arrayOfStrings(body.banks),
    cardTypes: arrayOfStrings(body.cardTypes),
    weekendOnly: body.weekendOnly === true || body.voucherType === 'weekend_deal',
    startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
    expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    active: body.active !== false,
  };
}


async function createPromoCustomerNotification(promo) {
  if (!promo || !isPromoActive(promo)) return null;
  const discountText = promo.discountType === 'percentage'
    ? `${Number(promo.discountValue || 0)}% OFF`
    : `৳${Number(promo.discountValue || 0).toLocaleString()} OFF`;
  return CustomerNotification.create({
    user: null,
    audience: 'customers',
    type: 'promo',
    title: `New voucher: ${promo.code}`,
    message: promo.description || `Use promo code ${promo.code} to get ${discountText}.`,
    link: '/coupons',
    promo: promo._id,
    active: true,
  });
}

const promoPopulate = [
  { path: 'sellers', select: 'name shopName shopLogo email phone status' },
  { path: 'products', select: 'name image price category subcategory childCategory brand seller' },
  { path: 'product', select: 'name image price category subcategory childCategory brand seller' },
];

router.get('/promos', requireAdmin, async (_req, res) => {
  const promos = await PromoCode.find().populate(promoPopulate).sort({ createdAt: -1 });
  res.json({ promos });
});

router.post('/promos', requireAdmin, async (req, res) => {
  const payload = normalizePromoPayload(req.body);
  if (!payload.code) return res.status(400).json({ message: 'Promo code is required' });
  if (!payload.discountValue || payload.discountValue <= 0) return res.status(400).json({ message: 'Discount value must be greater than 0' });

  const promo = await PromoCode.create(payload);
  const populatedPromo = await PromoCode.findById(promo._id).populate(promoPopulate);
  await createPromoCustomerNotification(promo);
  res.status(201).json({ promo: populatedPromo });
});

router.put('/promos/:id', requireAdmin, async (req, res) => {
  const payload = normalizePromoPayload(req.body);
  const before = await PromoCode.findById(req.params.id);
  const promo = await PromoCode.findByIdAndUpdate(req.params.id, payload, { new: true }).populate(promoPopulate);
  if (promo && promo.active !== false && before?.active === false) {
    await createPromoCustomerNotification(promo);
  }
  res.json({ promo });
});

router.delete('/promos/:id', requireAdmin, async (req, res) => { await PromoCode.findByIdAndDelete(req.params.id); res.json({ ok: true }); });


const bannerPayload = (body = {}) => {
  const placement = ['hero', 'header', 'event', 'voucher', 'campaign'].includes(String(body.placement || '')) ? String(body.placement) : 'hero';
  const targetType = ['all', 'category', 'brand', 'seller', 'products', 'customLink'].includes(String(body.targetType || '')) ? String(body.targetType) : 'all';
  const productIds = Array.isArray(body.productIds)
    ? body.productIds.map((id) => String(id || '').trim()).filter((id) => Product.db.base.Types.ObjectId.isValid(id))
    : [];
  return {
    image: String(body.image || '').trim(),
    title: String(body.title || '').trim(),
    subtitle: String(body.subtitle || '').trim(),
    link: String(body.link || '').trim(),
    placement,
    targetType,
    targetValue: String(body.targetValue || '').trim(),
    productIds,
    sortOrder: Number(body.sortOrder || 0),
    active: body.active !== false,
  };
};

router.get('/banners', requireAdmin, async (_req, res) => {
  const banners = await HeroSlide.find().sort({ placement: 1, sortOrder: 1, createdAt: -1 });
  res.json({ banners, heroSlides: banners });
});

router.post('/banners', requireAdmin, async (req, res) => {
  const payload = bannerPayload(req.body);
  if (!payload.image) return res.status(400).json({ message: 'Banner/photo image is required' });
  const banner = await HeroSlide.create(payload);
  res.status(201).json({ banner });
});

router.put('/banners/:id', requireAdmin, async (req, res) => {
  const payload = bannerPayload(req.body);
  if (!payload.image) return res.status(400).json({ message: 'Banner/photo image is required' });
  const banner = await HeroSlide.findByIdAndUpdate(req.params.id, payload, { new: true });
  res.json({ banner });
});

router.delete('/banners/:id', requireAdmin, async (req, res) => {
  await HeroSlide.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});


router.get('/customer-notifications', requireAdmin, async (_req, res) => {
  const notifications = await CustomerNotification.find({ user: null, audience: 'customers' })
    .populate('promo', 'code discountType discountValue')
    .sort({ createdAt: -1 })
    .limit(100);
  res.json({ notifications });
});

router.post('/customer-notifications', requireAdmin, async (req, res) => {
  const { type = 'event', title, message, link, image } = req.body || {};
  const allowed = ['promo', 'sale', 'event', 'system'];
  if (!allowed.includes(type)) return res.status(400).json({ message: 'Invalid notification type' });
  if (!String(title || '').trim()) return res.status(400).json({ message: 'Title is required' });
  if (!String(message || '').trim()) return res.status(400).json({ message: 'Message is required' });
  const notification = await CustomerNotification.create({
    user: null,
    audience: 'customers',
    type,
    title: String(title).trim(),
    message: String(message).trim(),
    link: link || '/notifications',
    image: image || '',
  });
  res.status(201).json({ notification });
});

router.patch('/customer-notifications/:id', requireAdmin, async (req, res) => {
  const notification = await CustomerNotification.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!notification) return res.status(404).json({ message: 'Notification not found' });
  res.json({ notification });
});

router.delete('/customer-notifications/:id', requireAdmin, async (req, res) => {
  await CustomerNotification.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

router.put('/settings', requireAdmin, async (req, res) => {
  const { fullName, email, password } = req.body;
  if (fullName !== undefined) req.user.fullName = fullName;
  if (email) req.user.email = email;
  if (password) req.user.passwordHash = await bcrypt.hash(password, 10);
  await req.user.save();
  res.json({ user: adminUser(req.user) });
});
export default router;
