import mongoose from 'mongoose';
import { toJSON } from './index.js';

const passwordOtpSchema = new mongoose.Schema({
  accountType: { type: String, enum: ['user', 'seller'], required: true },
  accountId: { type: mongoose.Schema.Types.ObjectId, required: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  targetPhone: { type: String, trim: true },
  purpose: { type: String, enum: ['password', 'phone'], default: 'password' },
  channel: { type: String, enum: ['auto', 'sms', 'email', 'both'], default: 'auto' },
  otpHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false },
  attempts: { type: Number, default: 0 },
}, { timestamps: true });

passwordOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
passwordOtpSchema.index({ accountType: 1, accountId: 1, purpose: 1, used: 1, createdAt: -1 });

toJSON(passwordOtpSchema);
export default mongoose.model('PasswordOtp', passwordOtpSchema);
