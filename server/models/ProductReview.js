import mongoose from 'mongoose';
import { toJSON } from './index.js';

const productReviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  orderItem: { type: mongoose.Schema.Types.ObjectId, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: '', trim: true },
  photos: [{ type: String, trim: true }],
}, { timestamps: true });

productReviewSchema.index({ user: 1, order: 1, orderItem: 1 }, { unique: true });
toJSON(productReviewSchema);
export default mongoose.model('ProductReview', productReviewSchema);
