import express from 'express';
import bcrypt from 'bcryptjs';
import Seller from '../models/Seller.js';
import Product from '../models/Product.js';
import ReturnRequest from '../models/ReturnRequest.js';
import PasswordOtp from '../models/PasswordOtp.js';
import { requireSeller, signToken } from '../middleware/auth.js';
import { sendPasswordOtpEmail } from '../utils/email.js';
import { sendPasswordOtpSms } from '../utils/sms.js';

const router = express.Router();
const publicAddress = (a) => ({
  id: a.id,
  label: a.label,
  name: a.name,
  phone: a.phone,
  division: a.division,
  district: a.district,
  area: a.area,
  address: a.address,
  landmark: a.landmark,
  latitude: a.latitude,
  longitude: a.longitude,
  isDefault: Boolean(a.isDefault),
});
const publicSeller = (s) => ({
  id: s.id,
  name: s.name,
  email: s.email,
  phone: s.phone,
  shopName: s.shopName,
  shopAddress: s.shopAddress,
  businessType: s.businessType,
  nidNumber: s.nidNumber,
  tinNumber: s.tinNumber,
  bankName: s.bankName,
  bankAccount: s.bankAccount,
  documents: s.documents || [],
  addresses: (s.addresses || []).map(publicAddress),
  status: s.status,
});

const otpResponse = ({ mailResult, smsResult, otp }) => {
  const smsSent = Boolean(smsResult?.sent);
  const emailSent = Boolean(mailResult?.sent);
  const sent = smsSent || emailSent;
  const target = smsSent && emailSent ? 'your phone and email' : smsSent ? 'your phone' : emailSent ? 'your email' : 'dev mode';
  return {
    message: sent ? `OTP sent to ${target}` : 'OTP generated. Configure SMS or SMTP to send OTP automatically.',
    sent,
    smsSent,
    emailSent,
    ...(sent ? {} : { devOtp: otp }),
  };
};

router.post('/register', async (req, res) => {
  const { name, email, phone, password, shopName, shopAddress, businessType, nidNumber, tinNumber, bankName, bankAccount, documents } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
  const exists = await Seller.findOne({ email: String(email).toLowerCase() });
  if (exists) return res.status(409).json({ message: 'Seller email already registered' });
  const seller = await Seller.create({ name, email, phone, passwordHash: await bcrypt.hash(password, 10), shopName, shopAddress, businessType, nidNumber, tinNumber, bankName, bankAccount, documents: documents || [] });
  res.status(201).json({ seller: publicSeller(seller) });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const seller = await Seller.findOne({ email: String(email || '').toLowerCase() });
  if (!seller || !(await bcrypt.compare(password || '', seller.passwordHash))) return res.status(401).json({ message: 'Invalid seller credentials' });
  if (seller.status === 'blocked') return res.status(403).json({ message: 'Your seller account is blocked' });
  res.json({ token: signToken({ id: seller.id, role: 'seller' }), seller: publicSeller(seller) });
});

router.get('/me', requireSeller, (req, res) => res.json({ seller: publicSeller(req.seller) }));

router.put('/profile', requireSeller, async (req, res) => {
  const { name, shopName, shopAddress, businessType, nidNumber, tinNumber, bankName, bankAccount } = req.body;
  Object.assign(req.seller, {
    name: name ?? req.seller.name,
    shopName: shopName ?? req.seller.shopName,
    shopAddress: shopAddress ?? req.seller.shopAddress,
    businessType: businessType ?? req.seller.businessType,
    nidNumber: nidNumber ?? req.seller.nidNumber,
    tinNumber: tinNumber ?? req.seller.tinNumber,
    bankName: bankName ?? req.seller.bankName,
    bankAccount: bankAccount ?? req.seller.bankAccount,
  });
  await req.seller.save();
  res.json({ seller: publicSeller(req.seller) });
});

router.post('/password/request-otp', requireSeller, async (req, res) => {
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  await PasswordOtp.updateMany({ accountType: 'seller', accountId: req.seller._id, purpose: 'password', used: false }, { used: true });
  await PasswordOtp.create({
    accountType: 'seller',
    accountId: req.seller._id,
    purpose: 'password',
    email: req.seller.email,
    phone: req.seller.phone,
    channel: process.env.OTP_CHANNEL || 'auto',
    otpHash: await bcrypt.hash(otp, 10),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });
  const channel = String(process.env.OTP_CHANNEL || 'auto').toLowerCase();
  const shouldSendSms = ['auto', 'sms', 'both'].includes(channel) && Boolean(req.seller.phone);
  const shouldSendEmail = ['email', 'both'].includes(channel) || (!shouldSendSms && Boolean(req.seller.email));
  const [smsResult, mailResult] = await Promise.all([
    shouldSendSms ? sendPasswordOtpSms({ to: req.seller.phone, otp, accountType: 'seller' }) : Promise.resolve({ sent: false, reason: 'SMS skipped' }),
    shouldSendEmail ? sendPasswordOtpEmail({ to: req.seller.email, otp, accountType: 'seller' }) : Promise.resolve({ sent: false, reason: 'Email skipped' }),
  ]);
  res.json(otpResponse({ mailResult, smsResult, otp }));
});


router.post('/phone/request-otp', requireSeller, async (req, res) => {
  const newPhone = String(req.body?.phone || '').trim();
  if (!newPhone) return res.status(400).json({ message: 'New phone number is required' });
  if (newPhone === (req.seller.phone || '')) return res.status(400).json({ message: 'This phone number is already saved on your profile' });

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  await PasswordOtp.updateMany({ accountType: 'seller', accountId: req.seller._id, purpose: 'phone', used: false }, { used: true });
  await PasswordOtp.create({
    accountType: 'seller',
    accountId: req.seller._id,
    purpose: 'phone',
    email: req.seller.email,
    phone: req.seller.phone,
    targetPhone: newPhone,
    channel: 'sms',
    otpHash: await bcrypt.hash(otp, 10),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });

  const smsResult = await sendPasswordOtpSms({ to: newPhone, otp, accountType: 'seller phone change' });
  res.json({
    message: smsResult?.sent ? 'OTP sent to your new phone number' : 'OTP generated. Configure SMS to send phone-change OTP automatically.',
    sent: Boolean(smsResult?.sent),
    smsSent: Boolean(smsResult?.sent),
    ...(smsResult?.sent ? {} : { devOtp: otp }),
  });
});

router.post('/phone/change', requireSeller, async (req, res) => {
  const otp = String(req.body?.otp || '').trim();
  if (!otp) return res.status(400).json({ message: 'OTP is required' });

  const record = await PasswordOtp.findOne({
    accountType: 'seller',
    accountId: req.seller._id,
    purpose: 'phone',
    used: false,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  if (!record) return res.status(400).json({ message: 'OTP expired or not found. Request a new OTP.' });
  if (record.attempts >= 5) {
    record.used = true;
    await record.save();
    return res.status(429).json({ message: 'Too many wrong attempts. Request a new OTP.' });
  }

  const valid = await bcrypt.compare(otp, record.otpHash);
  if (!valid) {
    record.attempts += 1;
    await record.save();
    return res.status(400).json({ message: 'Invalid OTP' });
  }

  req.seller.phone = record.targetPhone;
  record.used = true;
  await Promise.all([req.seller.save(), record.save()]);
  res.json({ message: 'Phone number changed successfully', seller: publicSeller(req.seller) });
});

router.post('/password/change', requireSeller, async (req, res) => {
  const { otp, newPassword } = req.body;
  if (!otp || !newPassword) return res.status(400).json({ message: 'OTP and new password are required' });
  if (String(newPassword).length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

  const record = await PasswordOtp.findOne({
    accountType: 'seller',
    accountId: req.seller._id,
    purpose: 'password',
    used: false,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  if (!record) return res.status(400).json({ message: 'OTP expired or not found. Request a new OTP.' });
  if (record.attempts >= 5) {
    record.used = true;
    await record.save();
    return res.status(429).json({ message: 'Too many wrong attempts. Request a new OTP.' });
  }

  const valid = await bcrypt.compare(String(otp), record.otpHash);
  if (!valid) {
    record.attempts += 1;
    await record.save();
    return res.status(400).json({ message: 'Invalid OTP' });
  }

  req.seller.passwordHash = await bcrypt.hash(String(newPassword), 10);
  record.used = true;
  await Promise.all([req.seller.save(), record.save()]);
  res.json({ message: 'Password changed successfully' });
});


router.get('/reverse-geocode', requireSeller, async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return res.status(400).json({ message: 'Valid latitude and longitude are required' });
  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lng));
    url.searchParams.set('addressdetails', '1');
    const response = await fetch(url, { headers: { 'User-Agent': `${process.env.APP_NAME || 'Shoppy'} seller-address/1.0` } });
    if (!response.ok) throw new Error('Reverse geocoding failed');
    const data = await response.json();
    const a = data.address || {};
    res.json({
      address: {
        latitude: lat,
        longitude: lng,
        address: data.display_name || '',
        division: a.state || a.division || '',
        district: a.city || a.town || a.county || a.state_district || '',
        area: a.suburb || a.neighbourhood || a.road || a.village || '',
      },
    });
  } catch (error) {
    res.json({ address: { latitude: lat, longitude: lng }, warning: 'Location captured, but address lookup failed. Please type the address manually.' });
  }
});

router.get('/addresses', requireSeller, (req, res) => {
  res.json({ addresses: (req.seller.addresses || []).map(publicAddress) });
});

router.post('/addresses', requireSeller, async (req, res) => {
  const payload = req.body || {};
  if (!payload.address && (!payload.latitude || !payload.longitude)) return res.status(400).json({ message: 'Address text or current location is required' });
  if (payload.isDefault || !req.seller.addresses?.length) req.seller.addresses.forEach((a) => { a.isDefault = false; });
  req.seller.addresses.push({
    label: payload.label || 'Warehouse',
    name: payload.name || req.seller.name,
    phone: payload.phone || req.seller.phone,
    division: payload.division,
    district: payload.district,
    area: payload.area,
    address: payload.address,
    landmark: payload.landmark,
    latitude: payload.latitude,
    longitude: payload.longitude,
    isDefault: payload.isDefault || !req.seller.addresses.length,
  });
  await req.seller.save();
  res.status(201).json({ addresses: req.seller.addresses.map(publicAddress), seller: publicSeller(req.seller) });
});

router.put('/addresses/:id', requireSeller, async (req, res) => {
  const address = req.seller.addresses.id(req.params.id);
  if (!address) return res.status(404).json({ message: 'Address not found' });
  const payload = req.body || {};
  ['label', 'name', 'phone', 'division', 'district', 'area', 'address', 'landmark', 'latitude', 'longitude'].forEach((key) => {
    if (payload[key] !== undefined) address[key] = payload[key];
  });
  if (payload.isDefault) req.seller.addresses.forEach((a) => { a.isDefault = String(a._id) === String(address._id); });
  await req.seller.save();
  res.json({ addresses: req.seller.addresses.map(publicAddress), seller: publicSeller(req.seller) });
});

router.delete('/addresses/:id', requireSeller, async (req, res) => {
  const address = req.seller.addresses.id(req.params.id);
  if (!address) return res.status(404).json({ message: 'Address not found' });
  const wasDefault = address.isDefault;
  address.deleteOne();
  if (wasDefault && req.seller.addresses.length) req.seller.addresses[0].isDefault = true;
  await req.seller.save();
  res.json({ addresses: req.seller.addresses.map(publicAddress), seller: publicSeller(req.seller) });
});

router.get('/returns', requireSeller, async (req, res) => {
  const returns = await ReturnRequest.find({ seller: req.seller.id })
    .populate('user')
    .populate('product')
    .populate('order')
    .sort({ createdAt: -1 });
  res.json({ returns });
});

router.get('/products', requireSeller, async (req, res) => res.json({ products: await Product.find({ seller: req.seller.id }).sort({ createdAt: -1 }) }));
router.post('/products', requireSeller, async (req, res) => res.status(201).json({ product: await Product.create({ ...req.body, seller: req.seller.id }) }));
router.put('/products/:id', requireSeller, async (req, res) => {
  const product = await Product.findOneAndUpdate({ _id: req.params.id, seller: req.seller.id }, req.body, { new: true });
  res.json({ product });
});
router.delete('/products/:id', requireSeller, async (req, res) => { await Product.findOneAndDelete({ _id: req.params.id, seller: req.seller.id }); res.json({ ok: true }); });
export default router;
