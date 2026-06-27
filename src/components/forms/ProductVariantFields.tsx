import React from 'react';

type Props = {
  colors: string;
  sizes: string;
  onChange: (next: { colors?: string; sizes?: string }) => void;
};

export default function ProductVariantFields({ colors, sizes, onChange }: Props) {
  return (
    <div className="sm:col-span-2 grid sm:grid-cols-2 gap-3">
      <div>
        <label className="block text-sm font-bold text-gray-800 mb-1">Available colors</label>
        <textarea
          className="border rounded-xl p-3 text-sm w-full min-h-[92px]"
          placeholder="One color per line, e.g.\nBlack\nRed\nNavy Blue"
          value={colors}
          onChange={(e) => onChange({ colors: e.target.value })}
        />
        <p className="text-xs text-gray-500 mt-1">Leave empty if this product has no color option.</p>
      </div>
      <div>
        <label className="block text-sm font-bold text-gray-800 mb-1">Available sizes</label>
        <textarea
          className="border rounded-xl p-3 text-sm w-full min-h-[92px]"
          placeholder="One size per line, e.g.\nS\nM\nL\nXL"
          value={sizes}
          onChange={(e) => onChange({ sizes: e.target.value })}
        />
        <p className="text-xs text-gray-500 mt-1">Leave empty if this product has no size option.</p>
      </div>
    </div>
  );
}
