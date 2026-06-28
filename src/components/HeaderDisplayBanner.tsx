import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

type Banner = {
  id: string;
  image: string;
  title?: string;
  subtitle?: string;
  link?: string;
  placement?: 'event' | 'voucher' | 'campaign' | 'hero' | 'header';
};

const labelFor = (placement?: string) => {
  if (placement === 'voucher') return 'Voucher';
  if (placement === 'campaign') return 'Campaign';
  if (placement === 'event') return 'Event';
  return 'Featured';
};

export default function HeaderDisplayBanner() {
  const [banners, setBanners] = useState<Banner[]>([]);

  useEffect(() => {
    api.get<{ banners?: Banner[]; heroSlides?: Banner[] }>('/hero-slides?placements=event,voucher,campaign')
      .then((res) => {
        const list = (res.banners || res.heroSlides || []).filter((b) => b.image).slice(0, 6);
        setBanners(list);
      })
      .catch(() => setBanners([]));
  }, []);

  if (!banners.length) return null;

  return (
    <section className="bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {banners.slice(0, 3).map((banner) => {
            const to = banner.link || `/display/${banner.id}`;
            return (
              <Link
                key={banner.id}
                to={to}
                className="relative block overflow-hidden rounded-xl h-16 sm:h-20 bg-gray-100 border border-orange-100 shadow-sm group"
              >
                <img src={banner.image} alt={banner.title || labelFor(banner.placement)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/15 to-transparent flex items-center px-4">
                  <div className="min-w-0">
                    <p className="inline-flex bg-white/90 text-orange-600 text-[10px] font-black rounded-full px-2 py-0.5 mb-1 uppercase tracking-wide">
                      {labelFor(banner.placement)}
                    </p>
                    <p className="text-white font-black text-xs sm:text-sm leading-tight truncate">{banner.title || `${labelFor(banner.placement)} Products`}</p>
                    {banner.subtitle && <p className="text-white/85 text-[11px] truncate">{banner.subtitle}</p>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
