import React, { ChangeEvent, DragEvent, useId, useState } from 'react';
import { Camera, ImagePlus, Loader2, UploadCloud, X } from 'lucide-react';
import { api } from '../../lib/api';

type ImageUploaderProps = {
  value?: string;
  onChange: (url: string) => void;
  token?: string | null;
  label?: string;
  helperText?: string;
};

const MAX_IMAGE_MB = 15;
const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024;

async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.size <= 2.5 * 1024 * 1024 || file.type === 'image/gif') return file;
  const bitmap = await createImageBitmap(file);
  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
}

export default function ImageUploader({
  value,
  onChange,
  token,
  label = 'Product photo',
  helperText = 'Drag & drop, browse, or capture from camera',
}: ImageUploaderProps) {
  const id = useId().replace(/:/g, '');
  const browseId = `${id}-browse`;
  const cameraId = `${id}-camera`;
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [localPreview, setLocalPreview] = useState('');

  const uploadFile = async (inputFile?: File) => {
    if (!inputFile) return;
    setError('');

    if (!inputFile.type.startsWith('image/')) {
      setError('Please upload an image file only.');
      return;
    }
    if (!token) {
      setError('Please login again before uploading a photo.');
      return;
    }

    let previewUrl = '';
    setUploading(true);
    try {
      const file = await compressImage(inputFile);
      if (file.size > MAX_IMAGE_BYTES) {
        setError(`Image size must be less than ${MAX_IMAGE_MB} MB. Please choose a smaller photo.`);
        return;
      }
      previewUrl = URL.createObjectURL(file);
      setLocalPreview(previewUrl);
      const data = new FormData();
      data.append('file', file, file.name || `photo-${Date.now()}.jpg`);
      const res = await api.upload<{ url: string }>('/uploads', data, token);
      onChange(res.url);
      setLocalPreview('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try another image.');
    } finally {
      setUploading(false);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    }
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    uploadFile(selected);
    event.target.value = '';
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    uploadFile(event.dataTransfer.files?.[0]);
  };

  const preview = localPreview || value;

  return (
    <div className="sm:col-span-2 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-gray-800">{label}</p>
          <p className="text-xs text-gray-500">{helperText}</p>
        </div>
        {value && (
          <button type="button" onClick={() => onChange('')} className="text-xs font-bold text-red-500 flex items-center gap-1">
            <X size={14} /> Remove
          </button>
        )}
      </div>

      <div
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-2xl p-4 transition bg-gray-50 ${dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
      >
        <div className="grid sm:grid-cols-[120px_1fr] gap-4 items-center">
          <div className="w-full h-28 rounded-xl bg-white border overflow-hidden flex items-center justify-center">
            {preview ? <img src={preview} alt="Preview" className="w-full h-full object-cover" /> : <ImagePlus className="text-gray-300" size={34} />}
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <label htmlFor={browseId} className={`cursor-pointer px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold flex items-center gap-2 ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
                {uploading ? <Loader2 className="animate-spin" size={16} /> : <UploadCloud size={16} />}
                Upload photo
              </label>
              <label htmlFor={cameraId} className={`cursor-pointer px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-bold flex items-center gap-2 ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
                <Camera size={16} /> Capture
              </label>
            </div>
            <p className="text-xs text-gray-500">Supported: JPG, PNG, WEBP, GIF. Large phone photos are compressed before upload.</p>
            {uploading && <p className="text-xs text-blue-600 font-semibold">Uploading photo...</p>}
            {error && <p className="text-xs text-red-500 font-semibold">{error}</p>}
          </div>
        </div>
      </div>

      <input id={browseId} type="file" accept="image/*" onChange={onFileChange} className="sr-only" />
      <input id={cameraId} type="file" accept="image/*" capture="environment" onChange={onFileChange} className="sr-only" />
    </div>
  );
}
