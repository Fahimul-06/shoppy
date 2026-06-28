import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

type Banner = { id: string; image: string; title?: string; subtitle?: string; link?: string };

export default function HeaderDisplayBanner() {
  const [banner, setBanner] = useState<Banner | null>(null);

  useEffect(() => {
    api.get<{ headerBanners?: Banner[]; banners?: Banner[]; heroSlides?: Banner[] }>('/hero-slides?placement=header')
      .then((res) => {
        const list = (res.headerBanners || res.banners || res.heroSlides || []).filter((b) => b.image);
        setBanner(list[0] || null);
      })
      .catch(() => setBanner(null));
  }, []);

  if (!banner) return null;

  const content = (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2">
      <div className="relative overflow-hidden rounded-2xl h-20 sm:h-24 bg-gray-100 border border-orange-100 shadow-sm">
        <img src={banner.image} alt={banner.title || 'Shoppy display'} className="w-full h-full object-cover" />
        {(banner.title || banner.subtitle) && (
          <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/15 to-transparent flex items-center px-5 sm:px-8">
            <div>
              {banner.title && <p className="text-white font-black text-sm sm:text-lg leading-tight">{banner.title}</p>}
              {banner.subtitle && <p className="text-white/85 text-xs sm:text-sm mt-0.5">{banner.subtitle}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return banner.link ? <Link to={banner.link} className="block bg-white">{content}</Link> : <div className="bg-white">{content}</div>;
}
