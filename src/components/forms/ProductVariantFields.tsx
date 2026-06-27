import React, { useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';

type Props = {
  colors: string;
  sizes: string;
  onChange: (next: { colors?: string; sizes?: string }) => void;
};

const COLOR_PRESETS = [
  'Black', 'White', 'Red', 'Blue', 'Navy Blue', 'Sky Blue', 'Green', 'Yellow', 'Orange', 'Pink', 'Purple', 'Brown', 'Grey', 'Beige', 'Maroon', 'Gold', 'Silver', 'Multicolor'
];

const SIZE_PRESETS = [
  'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL',
  '28', '30', '32', '34', '36', '38', '40', '42', '44',
  'Free Size', 'One Size',
  'EU 36', 'EU 37', 'EU 38', 'EU 39', 'EU 40', 'EU 41', 'EU 42', 'EU 43', 'EU 44'
];

const toList = (value: string) => String(value || '').split(/\n|,/).map((x) => x.trim()).filter(Boolean);
const toValue = (items: string[]) => Array.from(new Set(items.map((x) => x.trim()).filter(Boolean))).join('\n');

function ChipList({ items, onRemove }: { items: string[]; onRemove: (item: string) => void }) {
  if (!items.length) return <p className="text-xs text-gray-400 mt-2">No options selected.</p>;
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {items.map((item) => (
        <span key={item} className="inline-flex items-center gap-1 rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">
          {item}
          <button type="button" onClick={() => onRemove(item)} className="text-orange-500 hover:text-red-500"><X size={13} /></button>
        </span>
      ))}
    </div>
  );
}

export default function ProductVariantFields({ colors, sizes, onChange }: Props) {
  const selectedColors = useMemo(() => toList(colors), [colors]);
  const selectedSizes = useMemo(() => toList(sizes), [sizes]);
  const [customColor, setCustomColor] = useState('');
  const [customSize, setCustomSize] = useState('');

  const addColor = (value: string) => {
    const item = value.trim();
    if (!item) return;
    onChange({ colors: toValue([...selectedColors, item]) });
    setCustomColor('');
  };

  const addSize = (value: string) => {
    const item = value.trim();
    if (!item) return;
    onChange({ sizes: toValue([...selectedSizes, item]) });
    setCustomSize('');
  };

  const removeColor = (item: string) => onChange({ colors: toValue(selectedColors.filter((x) => x !== item)) });
  const removeSize = (item: string) => onChange({ sizes: toValue(selectedSizes.filter((x) => x !== item)) });

  return (
    <div className="sm:col-span-2 grid sm:grid-cols-2 gap-4">
      <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-3">
        <label className="block text-sm font-bold text-gray-800 mb-2">Available colours</label>
        <select
          className="border rounded-xl p-3 text-sm w-full bg-white"
          value=""
          onChange={(e) => addColor(e.target.value)}
        >
          <option value="">Select colour from dropdown</option>
          {COLOR_PRESETS.filter((color) => !selectedColors.includes(color)).map((color) => <option key={color} value={color}>{color}</option>)}
        </select>
        <div className="flex gap-2 mt-2">
          <input
            className="border rounded-xl p-3 text-sm w-full bg-white"
            placeholder="Custom colour"
            value={customColor}
            onChange={(e) => setCustomColor(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addColor(customColor); } }}
          />
          <button type="button" onClick={() => addColor(customColor)} className="rounded-xl bg-gray-900 text-white px-3 flex items-center"><Plus size={16} /></button>
        </div>
        <ChipList items={selectedColors} onRemove={removeColor} />
        <p className="text-xs text-gray-500 mt-2">Leave empty if this product has no colour option.</p>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-3">
        <label className="block text-sm font-bold text-gray-800 mb-2">Available sizes</label>
        <select
          className="border rounded-xl p-3 text-sm w-full bg-white"
          value=""
          onChange={(e) => addSize(e.target.value)}
        >
          <option value="">Select size from dropdown</option>
          {SIZE_PRESETS.filter((size) => !selectedSizes.includes(size)).map((size) => <option key={size} value={size}>{size}</option>)}
        </select>
        <div className="flex gap-2 mt-2">
          <input
            className="border rounded-xl p-3 text-sm w-full bg-white"
            placeholder="Custom size"
            value={customSize}
            onChange={(e) => setCustomSize(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSize(customSize); } }}
          />
          <button type="button" onClick={() => addSize(customSize)} className="rounded-xl bg-gray-900 text-white px-3 flex items-center"><Plus size={16} /></button>
        </div>
        <ChipList items={selectedSizes} onRemove={removeSize} />
        <p className="text-xs text-gray-500 mt-2">Leave empty if this product has no size option.</p>
      </div>
    </div>
  );
}
