import mongoose from 'mongoose';
import { toJSON } from './index.js';

const signalSchema = new mongoose.Schema({
  from: { type: String, enum: ['delivery', 'admin'], required: true },
  to: { type: String, enum: ['delivery', 'admin'], required: true },
  type: { type: String, enum: ['offer', 'answer', 'candidate', 'leave'], required: true },
  payload: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

const internetCallRoomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true, index: true },
  deliveryMan: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  supportMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliverySupportMessage' },
  status: { type: String, enum: ['ringing', 'joined', 'ended', 'missed'], default: 'ringing', index: true },
  deliveryJoinedAt: Date,
  adminJoinedAt: Date,
  endedAt: Date,
  relayEnabled: { type: Boolean, default: false },
  deliveryRelayReadyAt: Date,
  adminRelayReadyAt: Date,
  signals: [signalSchema],
}, { timestamps: true });

toJSON(internetCallRoomSchema);
export default mongoose.model('InternetCallRoom', internetCallRoomSchema);
