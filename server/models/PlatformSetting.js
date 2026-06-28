import mongoose from 'mongoose';
import { toJSON } from './index.js';

const platformSettingSchema = new mongoose.Schema({
  key: { type: String, default: 'default', unique: true, index: true },
  deliveryCharge: { type: Number, default: 120, min: 0 },
  freeDeliveryMin: { type: Number, default: 2000, min: 0 },
  platformFeeType: { type: String, enum: ['fixed', 'percent'], default: 'fixed' },
  platformFee: { type: Number, default: 0, min: 0 },
  vatPercent: { type: Number, default: 0, min: 0, max: 100 },
  flashSaleStartsAt: { type: Date, default: null },
  flashSaleEndsAt: { type: Date, default: null },
  flashSaleSlots: [{
    title: { type: String, default: '' },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    active: { type: Boolean, default: true },
  }],
}, { timestamps: true });

toJSON(platformSettingSchema);
export default mongoose.model('PlatformSetting', platformSettingSchema);
