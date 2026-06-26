import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import PasswordOtp from '../models/PasswordOtp.js';
import { requireUser, signToken } from '../middleware/auth.js';
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
const publicUser = (u) => ({
  id: u.id,
  fullName: u.fullName,
  email: u.email,
  phone: u.phone,
  profilePhoto: u.profilePhoto,
  role: u.role,
  addresses: (u.addresses || []).map(publicAddress),
});
const makeOtp = () => String(Math.floor(100000 + Math.random() * 900000));
const otpResponse = ({ mailResult, smsResult, otp }) => {
  const smsSent = Boolean(smsResult?.sent);
  const emailSent = Boolean(mailResult?.sent);
  const sent = smsSent || emailSent;
  const target = smsSent && emailSent ? 'your phone and email' : smsSent ? 'your phone' : emailSent ? 'your email' : 'dev mode';
  return { message: sent ? `OTP sent to ${target}` : 'OTP generated. Configure SMS or SMTP to send OTP automatically.', sent, smsSent, emailSent, ...(sent ? {} : { devOtp: otp }) };
};

async function verifyOtp({ accountId, purpose, otp, accountType = 'user' }) {
  const record = await PasswordOtp.findOne({ accountType, accountId, purpose, used: false, expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 });
  if (!record) return { error: 'OTP expired or not found. Request a new OTP.' };
  if (record.attempts >= 5) { record.used = true; await record.save(); return { status: 429, error: 'Too many wrong attempts. Request a new OTP.' }; }
  const valid = await bcrypt.compare(String(otp || ''), record.otpHash);
  if (!valid) { record.attempts += 1; await record.save(); return { error: 'Invalid OTP' }; }
  record.used = true;
  await record.save();
  return { record };
}

router.post('/register', async (req, res) => {
  const { name, fullName, email, phone, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) return res.status(409).json({ message: 'Email already registered' });
  const user = await User.create({ fullName: fullName || name, email, phone, passwordHash: await bcrypt.hash(password, 10), role: 'user' });
  const token = signToken({ id: user.id, role: user.role });
  res.status(201).json({ token, user: publicUser(user) });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: String(email || '').toLowerCase() });
  if (!user || !(await bcrypt.compare(password || '', user.passwordHash))) return res.status(401).json({ message: 'Invalid email or password' });
  const token = signToken({ id: user.id, role: user.role });
  res.json({ token, user: publicUser(user) });
});

router.get('/me', requireUser, (req, res) => res.json({ user: publicUser(req.user) }));

router.put('/profile', requireUser, async (req, res) => {
  const { fullName, name, profilePhoto } = req.body;
  req.user.fullName = fullName ?? name ?? req.user.fullName;
  if (profilePhoto !== undefined) req.user.profilePhoto = profilePhoto;
  await req.user.save();
  res.json({ user: publicUser(req.user) });
});

router.post('/password/request-otp', requireUser, async (req, res) => {
  const otp = makeOtp();
  await PasswordOtp.updateMany({ accountType: 'user', accountId: req.user._id, purpose: 'password', used: false }, { used: true });
  await PasswordOtp.create({ accountType: 'user', accountId: req.user._id, purpose: 'password', email: req.user.email, phone: req.user.phone, channel: process.env.OTP_CHANNEL || 'auto', otpHash: await bcrypt.hash(otp, 10), expiresAt: new Date(Date.now() + 10 * 60 * 1000) });
  const channel = String(process.env.OTP_CHANNEL || 'auto').toLowerCase();
  const shouldSendSms = ['auto', 'sms', 'both'].includes(channel) && Boolean(req.user.phone);
  const shouldSendEmail = ['email', 'both'].includes(channel) || (!shouldSendSms && Boolean(req.user.email));
  const [smsResult, mailResult] = await Promise.all([
    shouldSendSms ? sendPasswordOtpSms({ to: req.user.phone, otp, accountType: 'customer' }) : Promise.resolve({ sent: false }),
    shouldSendEmail ? sendPasswordOtpEmail({ to: req.user.email, otp, accountType: 'customer' }) : Promise.resolve({ sent: false }),
  ]);
  res.json(otpResponse({ mailResult, smsResult, otp }));
});

router.post('/password/change', requireUser, async (req, res) => {
  const { otp, newPassword } = req.body;
  if (!otp || !newPassword) return res.status(400).json({ message: 'OTP and new password are required' });
  if (String(newPassword).length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
  const result = await verifyOtp({ accountId: req.user._id, purpose: 'password', otp });
  if (result.error) return res.status(result.status || 400).json({ message: result.error });
  req.user.passwordHash = await bcrypt.hash(String(newPassword), 10);
  await req.user.save();
  res.json({ message: 'Password changed successfully' });
});

router.post('/phone/request-otp', requireUser, async (req, res) => {
  const newPhone = String(req.body?.phone || '').trim();
  if (!newPhone) return res.status(400).json({ message: 'New phone number is required' });
  if (newPhone === (req.user.phone || '')) return res.status(400).json({ message: 'This phone number is already saved on your profile' });
  const otp = makeOtp();
  await PasswordOtp.updateMany({ accountType: 'user', accountId: req.user._id, purpose: 'phone', used: false }, { used: true });
  await PasswordOtp.create({ accountType: 'user', accountId: req.user._id, purpose: 'phone', email: req.user.email, phone: req.user.phone, targetPhone: newPhone, channel: 'sms', otpHash: await bcrypt.hash(otp, 10), expiresAt: new Date(Date.now() + 10 * 60 * 1000) });
  const smsResult = await sendPasswordOtpSms({ to: newPhone, otp, accountType: 'customer phone change' });
  res.json({ message: smsResult?.sent ? 'OTP sent to your new phone number' : 'OTP generated. Configure SMS to send phone-change OTP automatically.', sent: Boolean(smsResult?.sent), smsSent: Boolean(smsResult?.sent), ...(smsResult?.sent ? {} : { devOtp: otp }) });
});

router.post('/phone/change', requireUser, async (req, res) => {
  const result = await verifyOtp({ accountId: req.user._id, purpose: 'phone', otp: req.body?.otp });
  if (result.error) return res.status(result.status || 400).json({ message: result.error });
  req.user.phone = result.record.targetPhone;
  await req.user.save();
  res.json({ message: 'Phone number changed successfully', user: publicUser(req.user) });
});

router.post('/email/request-otp', requireUser, async (req, res) => {
  const newEmail = String(req.body?.email || '').toLowerCase().trim();
  if (!newEmail) return res.status(400).json({ message: 'New email is required' });
  if (newEmail === req.user.email) return res.status(400).json({ message: 'This email is already saved on your profile' });
  const exists = await User.findOne({ email: newEmail, _id: { $ne: req.user._id } });
  if (exists) return res.status(409).json({ message: 'This email is already registered' });
  const otp = makeOtp();
  await PasswordOtp.updateMany({ accountType: 'user', accountId: req.user._id, purpose: 'email', used: false }, { used: true });
  await PasswordOtp.create({ accountType: 'user', accountId: req.user._id, purpose: 'email', email: req.user.email, targetEmail: newEmail, phone: req.user.phone, channel: 'email', otpHash: await bcrypt.hash(otp, 10), expiresAt: new Date(Date.now() + 10 * 60 * 1000) });
  const mailResult = await sendPasswordOtpEmail({ to: newEmail, otp, accountType: 'customer email change' });
  res.json({ message: mailResult?.sent ? 'OTP sent to your new email address' : 'OTP generated. Configure SMTP to send email-change OTP automatically.', sent: Boolean(mailResult?.sent), emailSent: Boolean(mailResult?.sent), ...(mailResult?.sent ? {} : { devOtp: otp }) });
});

router.post('/email/change', requireUser, async (req, res) => {
  const result = await verifyOtp({ accountId: req.user._id, purpose: 'email', otp: req.body?.otp });
  if (result.error) return res.status(result.status || 400).json({ message: result.error });
  const exists = await User.findOne({ email: result.record.targetEmail, _id: { $ne: req.user._id } });
  if (exists) return res.status(409).json({ message: 'This email is already registered' });
  req.user.email = result.record.targetEmail;
  await req.user.save();
  res.json({ message: 'Email changed successfully', user: publicUser(req.user) });
});


router.get('/reverse-geocode', requireUser, async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return res.status(400).json({ message: 'Valid latitude and longitude are required' });
  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lng));
    url.searchParams.set('addressdetails', '1');
    const response = await fetch(url, { headers: { 'User-Agent': `${process.env.APP_NAME || 'Shoppy'} customer-address/1.0` } });
    if (!response.ok) throw new Error('Reverse geocoding failed');
    const data = await response.json();
    const a = data.address || {};
    res.json({
      address: {
        latitude: lat,
        longitude: lng,
        address: data.display_name || '',
        division: a.state || a.division || '',
        district: a.city || a.town || a.village || a.county || a.municipality || '',
        area: a.suburb || a.neighbourhood || a.quarter || a.road || '',
      }
    });
  } catch (error) {
    res.json({ address: { latitude: lat, longitude: lng, address: '', division: '', district: '', area: '' }, warning: 'Location captured, but address text could not be detected automatically.' });
  }
});

router.get('/addresses', requireUser, (req, res) => {
  res.json({ addresses: (req.user.addresses || []).map(publicAddress) });
});

router.post('/addresses', requireUser, async (req, res) => {
  const payload = req.body || {};
  if (!payload.address && (!payload.latitude || !payload.longitude)) return res.status(400).json({ message: 'Address text or current location is required' });
  if (payload.isDefault || !req.user.addresses?.length) req.user.addresses.forEach((a) => { a.isDefault = false; });
  req.user.addresses.push({
    label: payload.label || 'Home',
    name: payload.name || req.user.fullName || '',
    phone: payload.phone || req.user.phone || '',
    division: payload.division || '',
    district: payload.district || '',
    area: payload.area || '',
    address: payload.address || '',
    landmark: payload.landmark || '',
    latitude: payload.latitude,
    longitude: payload.longitude,
    isDefault: payload.isDefault || !req.user.addresses.length,
  });
  await req.user.save();
  res.status(201).json({ addresses: req.user.addresses.map(publicAddress), user: publicUser(req.user) });
});

router.put('/addresses/:id', requireUser, async (req, res) => {
  const address = req.user.addresses.id(req.params.id);
  if (!address) return res.status(404).json({ message: 'Address not found' });
  const payload = req.body || {};
  ['label','name','phone','division','district','area','address','landmark','latitude','longitude'].forEach((key) => {
    if (payload[key] !== undefined) address[key] = payload[key];
  });
  if (payload.isDefault) req.user.addresses.forEach((a) => { a.isDefault = String(a._id) === String(address._id); });
  await req.user.save();
  res.json({ addresses: req.user.addresses.map(publicAddress), user: publicUser(req.user) });
});

router.delete('/addresses/:id', requireUser, async (req, res) => {
  const address = req.user.addresses.id(req.params.id);
  if (!address) return res.status(404).json({ message: 'Address not found' });
  const wasDefault = address.isDefault;
  address.deleteOne();
  if (wasDefault && req.user.addresses.length) req.user.addresses[0].isDefault = true;
  await req.user.save();
  res.json({ addresses: req.user.addresses.map(publicAddress), user: publicUser(req.user) });
});

export default router;
