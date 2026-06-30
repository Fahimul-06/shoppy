import React, { ChangeEvent, DragEvent, useId, useState } from 'react';
import { Camera, ImagePlus, Loader2, UploadCloud, X } from 'lucide-react';
import { api } from '../../lib/api';

type Props = {
  value?: string[];
  onChange: (urls: string[]) => void;
  token?: string | null;
  label?: string;
};

const MAX_IMAGE_MB = 15;
const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024;

async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.size <= 2.5 * 1024 * 1024 || file.type === 'image/gif') return file;
  const bitmap = await createImageBitmap(file);
  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
  return blob ? new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' }) : file;
}

export default function MultiImageUploader({ value = [], onChange, token, label = 'Product photos' }: Props) {
  const id = useId().replace(/:/g, '');
  const browseId = `${id}-browse`;
  const cameraId = `${id}-camera`;
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const uploadFiles = async (files?: FileList | File[]) => {
    const selected = Array.from(files || []).filter((file) => file.type.startsWith('image/'));
    if (!selected.length) return;
    if (!token) { setError('Please login again before uploading photos.'); return; }
    setUploading(true);
    setError('');
    try {
      const uploaded: string[] = [];
      for (const input of selected) {
        const file = await compressImage(input);
        if (file.size > MAX_IMAGE_BYTES) throw new Error(`Each image must be less than ${MAX_IMAGE_MB} MB.`);
        const data = new FormData();
        data.append('file', file, file.name || `photo-${Date.now()}.jpg`);
        const res = await api.upload<{ url: string }>('/uploads', data, token);
        uploaded.push(res.url);
      }
      onChange([...value, ...uploaded].filter(Boolean));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Photo upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    uploadFiles(event.target.files || undefined);
    event.target.value = '';
  };

  const removeAt = (index: number) => onChange(value.filter((_, i) => i !== index));
  const setPrimary = (index: number) => {
    const next = [...value];
    const [item] = next.splice(index, 1);
    onChange([item, ...next]);
  };

  return (
    <div className="sm:col-span-2 space-y-2">
      <div>
        <p className="text-sm font-bold text-gray-800">{label}</p>
        <p className="text-xs text-gray-500">Upload many photos. First photo is the main product image.</p>
      </div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragging(false); uploadFiles(e.dataTransfer.files); }}
        className={`border-2 border-dashed rounded-2xl p-4 bg-gray-50 ${dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
      >
        <div className="flex flex-wrap gap-2 mb-3">
          <label htmlFor={browseId} className={`cursor-pointer px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold flex items-center gap-2 ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
            {uploading ? <Loader2 className="animate-spin" size={16} /> : <UploadCloud size={16} />} Upload photos
          </label>
          <label htmlFor={cameraId} className={`cursor-pointer px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-bold flex items-center gap-2 ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
            <Camera size={16} /> Capture
          </label>
        </div>
        {value.length ? (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {value.map((url, index) => (
              <div key={`${url}-${index}`} className="relative group rounded-xl overflow-hidden border bg-white aspect-square">
                <img src={url} alt="Product" className="w-full h-full object-cover" />
                <button type="button" onClick={() => removeAt(index)} className="absolute top-1 right-1 bg-white/90 text-red-500 rounded-full p-1 shadow"><X size={14} /></button>
                {index === 0 ? <span className="absolute bottom-1 left-1 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Main</span> : <button type="button" onClick={() => setPrimary(index)} className="absolute bottom-1 left-1 bg-white/90 text-gray-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Set main</button>}
              </div>
            ))}
          </div>
        ) : (
          <div className="h-28 rounded-xl bg-white border flex flex-col items-center justify-center text-gray-400">
            <ImagePlus size={30} />
            <span className="text-xs mt-1">Drag photos here</span>
          </div>
        )}
        {uploading && <p className="text-xs text-blue-600 font-semibold mt-2">Uploading photos...</p>}
        {error && <p className="text-xs text-red-500 font-semibold mt-2">{error}</p>}
      </div>
      <input id={browseId} type="file" accept="image/*" multiple onChange={onFileChange} className="sr-only" />
      <input id={cameraId} type="file" accept="image/*" capture="environment" onChange={onFileChange} className="sr-only" />
    </div>
  );
}
