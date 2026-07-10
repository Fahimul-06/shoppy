import { v2 as cloudinary } from 'cloudinary';

function firstEnv(...names) {
  for (const name of names) {
    const value = process.env[name];
    if (value && String(value).trim()) return String(value).trim();
  }
  return '';
}

export function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_URL ||
    (firstEnv('CLOUDINARY_CLOUD_NAME') && firstEnv('CLOUDINARY_API_KEY') && firstEnv('CLOUDINARY_API_SECRET'))
  );
}

export function configureCloudinary() {
  if (process.env.CLOUDINARY_URL) {
    cloudinary.config({ secure: true });
    return true;
  }

  const cloud_name = firstEnv('CLOUDINARY_CLOUD_NAME');
  const api_key = firstEnv('CLOUDINARY_API_KEY');
  const api_secret = firstEnv('CLOUDINARY_API_SECRET');

  if (!cloud_name || !api_key || !api_secret) return false;

  cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
  return true;
}

function uploadBufferToCloudinary(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    stream.end(buffer);
  });
}

export async function uploadImageBuffer(file, options = {}) {
  if (!file?.buffer) throw new Error('No image file buffer found');
  if (!isCloudinaryConfigured() || !configureCloudinary()) {
    const err = new Error('Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in your server environment.');
    err.status = 500;
    throw err;
  }

  const originalName = String(file.originalname || 'image').replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'image';
  const folder = options.folder || process.env.CLOUDINARY_UPLOAD_FOLDER || 'shoppy';

  const result = await uploadBufferToCloudinary(file.buffer, {
    folder,
    resource_type: 'image',
    use_filename: true,
    unique_filename: true,
    public_id: `${Date.now()}-${originalName}`,
    overwrite: false,
    transformation: [
      { quality: 'auto:good', fetch_format: 'auto' },
    ],
    ...options,
  });

  return {
    url: result.secure_url || result.url,
    path: result.secure_url || result.url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
    format: result.format,
    bytes: result.bytes,
    provider: 'cloudinary',
  };
}

export default cloudinary;
