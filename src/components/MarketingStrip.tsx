import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

type Banner = {
  id: string;
  image: string;
  title?: string;
  subtitle?: string;
  link?: string;
  placement?: 'event' | 'voucher' | 'campaign' | string;
};

const labelOf = (placement?: string) => {
  if (placement === 'voucher') return 'Voucher';
  if (placement === 'campaign') return 'Campaign';
  if (placement === 'event') return 'Event';
  return 'Offer';
};

export default function MarketingStrip() {
  const [banners, setBanners] = useState<Banner[]>([]);

  useEffect(() => {
    let active = true;
    api.get<{ heroSlides?: Banner[]; banners?: Banner[] }>('/hero-slides?placement=event,voucher,campaign')
      .then((res) => {
        if (!active) return;
        const list = (res.heroSlides || res.banners || []).filter((item) => item.image);
        setBanners(list.slice(0, 8));
      })
      .catch(() => active && setBanners([]));
    return () => { active = false; };
  }, []);

  if (!banners.length) return null;

  return (
    <section className="bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2">
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
          {banners.map((banner) => {
            const href = banner.link?.trim() || `/display/${banner.id}`;
            return (
              <Link
                key={banner.id}
                to={href}
                className="group relative flex-shrink-0 w-56 sm:w-72 h-20 overflow-hidden rounded-2xl border border-orange-100 bg-orange-50 shadow-sm hover:shadow-md transition-all"
              >
                <img src={banner.image} alt={banner.title || labelOf(banner.placement)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/15 to-transparent" />
                <div className="absolute inset-0 flex items-center px-4">
                  <div>
                    <p className="inline-flex rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-orange-600">{labelOf(banner.placement)}</p>
                    <h3 className="mt-1 text-sm font-black leading-tight text-white line-clamp-1">{banner.title || labelOf(banner.placement)}</h3>
                    {banner.subtitle && <p className="text-[11px] font-medium text-white/85 line-clamp-1">{banner.subtitle}</p>}
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
