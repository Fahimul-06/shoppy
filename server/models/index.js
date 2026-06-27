import mongoose from 'mongoose';

export async function connectDB() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is missing');
  mongoose.set('strictQuery', true);
  await mongoose.connect(process.env.MONGODB_URI);
}

function safeTransform(_doc, ret) {
  if (!ret || typeof ret !== 'object') return ret;

  // Some nested/populated Mongoose documents can be serialized after _id has
  // already been removed or was never selected. Never call toString() on an
  // undefined _id because that crashes API responses on Render.
  if (ret._id != null) {
    ret.id = typeof ret._id.toString === 'function' ? ret._id.toString() : String(ret._id);
    delete ret._id;
  } else if (ret.id != null) {
    ret.id = typeof ret.id.toString === 'function' ? ret.id.toString() : String(ret.id);
  }

  return ret;
}

export function toJSON(schema) {
  const options = {
    virtuals: true,
    versionKey: false,
    transform: safeTransform,
  };

  schema.set('toJSON', options);
  schema.set('toObject', options);
}
