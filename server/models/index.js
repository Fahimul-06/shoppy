import mongoose from 'mongoose';
export async function connectDB() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is missing');
  mongoose.set('strictQuery', true);
  await mongoose.connect(process.env.MONGODB_URI);
}
export function toJSON(schema) {
  schema.set('toJSON', { virtuals: true, versionKey: false, transform: (_doc, ret) => { ret.id = ret._id.toString(); delete ret._id; return ret; } });
}
