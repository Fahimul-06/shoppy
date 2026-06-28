import React from 'react';
import { categories } from '../../data/categories';
import { getChildCategories, getSubcategories } from '../../data/categoryOptions';

type Props = {
  category: string;
  subcategory?: string;
  childCategory?: string;
  onChange: (next: { category: string; subcategory: string; childCategory: string }) => void;
  className?: string;
};

export default function CategoryDropdowns({ category, subcategory = '', childCategory = '', onChange, className = '' }: Props) {
  const selectedCategory = category || categories[0]?.slug || 'all';
  const subcategories = getSubcategories(selectedCategory);
  const childCategories = subcategory ? getChildCategories(selectedCategory, subcategory) : [];

  const selectCategory = (value: string) => {
    onChange({ category: value, subcategory: '', childCategory: '' });
  };

  const selectSubcategory = (value: string) => {
    onChange({ category: selectedCategory, subcategory: value, childCategory: '' });
  };

  const selectChildCategory = (value: string) => {
    onChange({ category: selectedCategory, subcategory, childCategory: value });
  };

  return (
    <div className={`grid sm:grid-cols-3 gap-3 ${className}`}>
      <label className="block">
        <span className="block text-xs font-bold text-gray-500 mb-1">Category</span>
        <select
          className="w-full border rounded-xl p-3 text-sm bg-white"
          value={selectedCategory}
          onChange={(e) => selectCategory(e.target.value)}
        >
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="block text-xs font-bold text-gray-500 mb-1">Sub category</span>
        <select
          className="w-full border rounded-xl p-3 text-sm bg-white disabled:bg-gray-100 disabled:text-gray-400"
          value={subcategory}
          onChange={(e) => selectSubcategory(e.target.value)}
          disabled={subcategories.length === 0}
        >
          <option value="">Select sub category</option>
          {subcategories.map((sub) => (
            <option key={sub} value={sub}>{sub}</option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="block text-xs font-bold text-gray-500 mb-1">Child category</span>
        <select
          className="w-full border rounded-xl p-3 text-sm bg-white disabled:bg-gray-100 disabled:text-gray-400"
          value={childCategory}
          onChange={(e) => selectChildCategory(e.target.value)}
          disabled={!subcategory || childCategories.length === 0}
        >
          <option value="">Select child category</option>
          {childCategories.map((child) => (
            <option key={child} value={child}>{child}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
