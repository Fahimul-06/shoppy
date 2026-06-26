import mongoose from 'mongoose';
import { toJSON } from './index.js';
const userSchema = new mongoose.Schema({
  fullName: { type: String, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  profilePhoto: { type: String, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
}, { timestamps: true });
toJSON(userSchema);
export default mongoose.model('User', userSchema);
