import mongoose from 'mongoose';
import { toJSON } from './index.js';
const addressSchema = new mongoose.Schema({
  label: { type: String, trim: true, default: 'Warehouse' },
  name: { type: String, trim: true },
  phone: { type: String, trim: true },
  division: { type: String, trim: true },
  district: { type: String, trim: true },
  area: { type: String, trim: true },
  address: { type: String, trim: true },
  landmark: { type: String, trim: true },
  latitude: Number,
  longitude: Number,
  isDefault: { type: Boolean, default: false },
}, { timestamps: true });

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
  addresses: [addressSchema],
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'blocked'], default: 'pending' },
}, { timestamps: true });
toJSON(sellerSchema);
export default mongoose.model('Seller', sellerSchema);
