import mongoose from 'mongoose';
import { toJSON } from './index.js';
const addressSchema = new mongoose.Schema({
  label: { type: String, trim: true, default: 'Home' },
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

const userSchema = new mongoose.Schema({
  fullName: { type: String, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  profilePhoto: { type: String, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['user', 'customer', 'admin', 'delivery'], default: 'user' },
  nid: { type: String, trim: true },
  adminType: { type: String, enum: ['owner', 'employee'], default: 'owner' },
  adminPosition: { type: String, trim: true },
  adminPermissions: [{ type: String, trim: true }],
  adminStatus: { type: String, enum: ['active', 'inactive'], default: 'active' },
  createdByAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  addresses: [addressSchema],
}, { timestamps: true });
toJSON(userSchema);
export default mongoose.model('User', userSchema);
