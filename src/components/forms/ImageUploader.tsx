import React, { ChangeEvent, DragEvent, useRef, useState } from 'react';
import { Camera, ImagePlus, Loader2, UploadCloud, X } from 'lucide-react';
import { api } from '../../lib/api';

type ImageUploaderProps = {
  value?: string;
  onChange: (url: string) => void;
  token?: string | null;
  label?: string;
  helperText?: string;
};

export default function ImageUploader({
  value,
  onChange,
  token,
  label = 'Product photo',
  helperText = 'Drag & drop, browse, or capture from camera',
}: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const uploadFile = async (file?: File) => {
    if (!file) return;
    setError('');
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file only.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5 MB.');
      return;
    }
    const data = new FormData();
    data.append('file', file);
    setUploading(true);
    try {
      const res = await api.upload<{ url: string }>('/uploads', data, token);
      onChange(res.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    uploadFile(event.target.files?.[0]);
    event.target.value = '';
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    uploadFile(event.dataTransfer.files?.[0]);
  };

  return (
    <div className="sm:col-span-2 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-gray-800">{label}</p>
          <p className="text-xs text-gray-500">{helperText}</p>
        </div>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-xs font-bold text-red-500 flex items-center gap-1"
          >
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
            {value ? (
              <img src={value} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <ImagePlus className="text-gray-300" size={34} />
            )}
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60"
              >
                {uploading ? <Loader2 className="animate-spin" size={16} /> : <UploadCloud size={16} />}
                Upload photo
              </button>
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={uploading}
                className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60"
              >
                <Camera size={16} /> Capture
              </button>
            </div>
            <p className="text-xs text-gray-500">Supported: JPG, PNG, WEBP, GIF. Max size: 5 MB.</p>
            {error && <p className="text-xs text-red-500 font-semibold">{error}</p>}
          </div>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={onFileChange} className="hidden" />
    </div>
  );
}
