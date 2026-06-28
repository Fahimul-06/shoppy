import React, { useEffect, useRef, useState } from 'react';
import { Loader2, MapPin, Maximize2, X } from 'lucide-react';

declare global {
  interface Window {
    L?: any;
  }
}

type Props = {
  open: boolean;
  initialLatitude?: number;
  initialLongitude?: number;
  onClose: () => void;
  onPick: (coords: { latitude: number; longitude: number }) => void;
};

const DEFAULT_CENTER: [number, number] = [23.8103, 90.4125];
let leafletLoadPromise: Promise<any> | null = null;

function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (leafletLoadPromise) return leafletLoadPromise;
  leafletLoadPromise = new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-leaflet-css]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.setAttribute('data-leaflet-css', 'true');
      document.head.appendChild(link);
    }
    const existing = document.querySelector<HTMLScriptElement>('script[data-leaflet-js]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.L));
      existing.addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.setAttribute('data-leaflet-js', 'true');
    script.onload = () => resolve(window.L);
    script.onerror = () => reject(new Error('Could not load map. Please check your internet connection.'));
    document.body.appendChild(script);
  });
  return leafletLoadPromise;
}

export default function MapLocationPicker({ open, initialLatitude, initialLongitude, onClose, onPick }: Props) {
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<{ latitude: number; longitude: number } | null>(
    initialLatitude && initialLongitude ? { latitude: initialLatitude, longitude: initialLongitude } : null,
  );

  useEffect(() => {
    if (!open || !mapEl.current) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    loadLeaflet()
      .then((L) => {
        if (cancelled || !mapEl.current) return;
        const center: [number, number] = initialLatitude && initialLongitude ? [initialLatitude, initialLongitude] : DEFAULT_CENTER;
        if (!mapRef.current) {
          mapRef.current = L.map(mapEl.current, { scrollWheelZoom: true }).setView(center, 15);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors',
          }).addTo(mapRef.current);
          mapRef.current.on('click', (event: any) => {
            const coords = { latitude: Number(event.latlng.lat.toFixed(7)), longitude: Number(event.latlng.lng.toFixed(7)) };
            setSelected(coords);
            if (markerRef.current) markerRef.current.setLatLng(event.latlng);
            else {
              markerRef.current = L.marker(event.latlng, { draggable: true }).addTo(mapRef.current);
              markerRef.current.on('dragend', () => {
                const latlng = markerRef.current.getLatLng();
                setSelected({ latitude: Number(latlng.lat.toFixed(7)), longitude: Number(latlng.lng.toFixed(7)) });
              });
            }
          });
        } else {
          mapRef.current.setView(center, 15);
          setTimeout(() => mapRef.current.invalidateSize(), 150);
        }
        if (initialLatitude && initialLongitude) {
          const latlng = [initialLatitude, initialLongitude];
          if (markerRef.current) markerRef.current.setLatLng(latlng);
          else {
            markerRef.current = L.marker(latlng, { draggable: true }).addTo(mapRef.current);
            markerRef.current.on('dragend', () => {
              const dragged = markerRef.current.getLatLng();
              setSelected({ latitude: Number(dragged.lat.toFixed(7)), longitude: Number(dragged.lng.toFixed(7)) });
            });
          }
        }
        setTimeout(() => mapRef.current?.invalidateSize(), 200);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Map failed to load.'))
      .finally(() => setLoading(false));
    return () => { cancelled = true; };
  }, [open, initialLatitude, initialLongitude]);

  useEffect(() => {
    if (open) setSelected(initialLatitude && initialLongitude ? { latitude: initialLatitude, longitude: initialLongitude } : null);
  }, [open, initialLatitude, initialLongitude]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-black/50 p-4 flex items-center justify-center">
      <div className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h3 className="font-black text-gray-900 flex items-center gap-2"><MapPin size={18}/> Pin delivery location</h3>
            <p className="text-xs text-gray-500">Tap/click the map or drag the pin to your exact delivery area.</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"><X size={17}/></button>
        </div>
        <div className="relative">
          <div ref={mapEl} className="h-[420px] w-full bg-gray-100" />
          {loading && <div className="absolute inset-0 bg-white/80 flex items-center justify-center text-sm font-bold text-gray-600"><Loader2 className="animate-spin mr-2" size={16}/> Loading map...</div>}
          {error && <div className="absolute left-4 right-4 top-4 bg-red-50 border border-red-100 text-red-600 rounded-xl p-3 text-sm">{error}</div>}
          {!selected && !loading && !error && <div className="absolute left-4 right-4 bottom-4 bg-white shadow rounded-xl p-3 text-sm text-gray-600 flex gap-2"><Maximize2 size={16}/> Tap on the map to drop a delivery pin.</div>}
        </div>
        <div className="p-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500">{selected ? 'Location pin selected. Address name will be filled automatically when possible.' : 'No pin selected yet.'}</p>
          <button
            disabled={!selected}
            onClick={() => selected && onPick(selected)}
            className="bg-orange-500 disabled:bg-gray-300 text-white font-bold px-5 py-3 rounded-xl"
          >Use This Pin</button>
        </div>
      </div>
    </div>
  );
}
