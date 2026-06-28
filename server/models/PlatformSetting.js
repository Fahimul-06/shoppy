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
  dailySaleBanner: {
    mode: { type: String, enum: ['color', 'image'], default: 'color' },
    colorFrom: { type: String, default: '#f97316' },
    colorTo: { type: String, default: '#ef4444' },
    image: { type: String, default: '' },
  },
  flashSaleBanner: {
    mode: { type: String, enum: ['color', 'image'], default: 'color' },
    colorFrom: { type: String, default: '#dc2626' },
    colorTo: { type: String, default: '#f97316' },
    image: { type: String, default: '' },
  },
  productFrames: {
    dailySaleFrame: { type: String, default: '' },
    flashSaleFrame: { type: String, default: '' },
    freeDeliveryFrame: { type: String, default: '' },
  },
}, { timestamps: true });

toJSON(platformSettingSchema);
export default mongoose.model('PlatformSetting', platformSettingSchema);
