import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import PasswordOtp from '../models/PasswordOtp.js';
import { requireUser, signToken } from '../middleware/auth.js';
import { sendPasswordOtpEmail } from '../utils/email.js';
import { sendPasswordOtpSms } from '../utils/sms.js';

const router = express.Router();
const publicUser = (u) => ({ id: u.id, fullName: u.fullName, email: u.email, phone: u.phone, role: u.role });
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
  const { fullName, name } = req.body;
  req.user.fullName = fullName ?? name ?? req.user.fullName;
  await req.user.save();
  res.json({ user: publicUser(req.user) });
});

router.post('/password/request-otp', requireUser, async (req, res) => {
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  await PasswordOtp.updateMany({ accountType: 'user', accountId: req.user._id, purpose: 'password', used: false }, { used: true });
  await PasswordOtp.create({
    accountType: 'user',
    accountId: req.user._id,
    purpose: 'password',
    email: req.user.email,
    phone: req.user.phone,
    channel: process.env.OTP_CHANNEL || 'auto',
    otpHash: await bcrypt.hash(otp, 10),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });
  const channel = String(process.env.OTP_CHANNEL || 'auto').toLowerCase();
  const shouldSendSms = ['auto', 'sms', 'both'].includes(channel) && Boolean(req.user.phone);
  const shouldSendEmail = ['email', 'both'].includes(channel) || (!shouldSendSms && Boolean(req.user.email));
  const [smsResult, mailResult] = await Promise.all([
    shouldSendSms ? sendPasswordOtpSms({ to: req.user.phone, otp, accountType: 'customer' }) : Promise.resolve({ sent: false, reason: 'SMS skipped' }),
    shouldSendEmail ? sendPasswordOtpEmail({ to: req.user.email, otp, accountType: 'customer' }) : Promise.resolve({ sent: false, reason: 'Email skipped' }),
  ]);
  res.json(otpResponse({ mailResult, smsResult, otp }));
});


router.post('/phone/request-otp', requireUser, async (req, res) => {
  const newPhone = String(req.body?.phone || '').trim();
  if (!newPhone) return res.status(400).json({ message: 'New phone number is required' });
  if (newPhone === (req.user.phone || '')) return res.status(400).json({ message: 'This phone number is already saved on your profile' });

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  await PasswordOtp.updateMany({ accountType: 'user', accountId: req.user._id, purpose: 'phone', used: false }, { used: true });
  await PasswordOtp.create({
    accountType: 'user',
    accountId: req.user._id,
    purpose: 'phone',
    email: req.user.email,
    phone: req.user.phone,
    targetPhone: newPhone,
    channel: 'sms',
    otpHash: await bcrypt.hash(otp, 10),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });

  const smsResult = await sendPasswordOtpSms({ to: newPhone, otp, accountType: 'customer phone change' });
  res.json({
    message: smsResult?.sent ? 'OTP sent to your new phone number' : 'OTP generated. Configure SMS to send phone-change OTP automatically.',
    sent: Boolean(smsResult?.sent),
    smsSent: Boolean(smsResult?.sent),
    ...(smsResult?.sent ? {} : { devOtp: otp }),
  });
});

router.post('/phone/change', requireUser, async (req, res) => {
  const otp = String(req.body?.otp || '').trim();
  if (!otp) return res.status(400).json({ message: 'OTP is required' });

  const record = await PasswordOtp.findOne({
    accountType: 'user',
    accountId: req.user._id,
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

  req.user.phone = record.targetPhone;
  record.used = true;
  await Promise.all([req.user.save(), record.save()]);
  res.json({ message: 'Phone number changed successfully', user: publicUser(req.user) });
});

router.post('/password/change', requireUser, async (req, res) => {
  const { otp, newPassword } = req.body;
  if (!otp || !newPassword) return res.status(400).json({ message: 'OTP and new password are required' });
  if (String(newPassword).length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

  const record = await PasswordOtp.findOne({
    accountType: 'user',
    accountId: req.user._id,
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

  req.user.passwordHash = await bcrypt.hash(String(newPassword), 10);
  record.used = true;
  await Promise.all([req.user.save(), record.save()]);
  res.json({ message: 'Password changed successfully' });
});

export default router;
