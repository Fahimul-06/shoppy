import mongoose from 'mongoose';
import { toJSON } from './index.js';
const sellerSchema = new mongoose.Schema({
  name: String,
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: String,
  passwordHash: { type: String, required: true },
  shopName: String,
  shopAddress: String,
  businessType: String,
  nidNumber: String,
  tinNumber: String,
  bankName: String,
  bankAccount: String,
  documents: [{ name: String, url: String }],
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'blocked'], default: 'pending' },
}, { timestamps: true });
toJSON(sellerSchema);
export default mongoose.model('Seller', sellerSchema);
