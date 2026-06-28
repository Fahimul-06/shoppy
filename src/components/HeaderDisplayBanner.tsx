import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

type Banner = {
  id: string;
  sourceId?: string;
  image: string;
  title?: string;
  subtitle?: string;
  link?: string;
  bannerType?: 'generic' | 'event' | 'voucher' | 'campaign';
};

const badgeText = (type?: string) => {
  if (type === 'event') return 'Event';
  if (type === 'voucher') return 'Voucher';
  if (type === 'campaign') return 'Campaign';
  return 'Featured';
};

const defaultLink = (banner: Banner) => {
  if (banner.link) return banner.link;
  if (banner.id?.startsWith('promo-') || banner.sourceId) return `/promotion/promo/${encodeURIComponent(String(banner.sourceId || banner.id).replace(/^promo-/, ''))}`;
  return `/promotion/banner/${encodeURIComponent(banner.id)}`;
};

export default function HeaderDisplayBanner() {
  const [banners, setBanners] = useState<Banner[]>([]);

  useEffect(() => {
    api.get<{ headerBanners?: Banner[]; banners?: Banner[]; heroSlides?: Banner[] }>('/hero-slides?placement=header')
      .then((res) => {
        const list = (res.headerBanners || res.banners || res.heroSlides || []).filter((b) => b.image);
        setBanners(list.slice(0, 10));
      })
      .catch(() => setBanners([]));
  }, []);

  if (!banners.length) return null;

  return (
    <div className="bg-white border-b border-orange-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="rounded-3xl bg-gradient-to-r from-orange-50 via-amber-50 to-orange-100 border border-orange-100 p-3 shadow-sm">
          <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-hide">
            {banners.map((banner) => (
              <Link
                key={banner.id}
                to={defaultLink(banner)}
                className="group relative block min-w-[250px] sm:min-w-[340px] lg:min-w-[420px] h-32 sm:h-40 rounded-2xl overflow-hidden bg-orange-100 snap-start border border-white shadow-sm hover:shadow-md transition-shadow"
              >
                <img src={banner.image} alt={banner.title || 'Shoppy promotion'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/25 to-transparent" />
                <div className="absolute inset-0 p-4 sm:p-5 flex flex-col justify-between">
                  <span className="w-fit rounded-full bg-orange-500 text-white text-[10px] sm:text-xs font-black px-2.5 py-1 uppercase tracking-wide">
                    {badgeText(banner.bannerType)}
                  </span>
                  <div>
                    {banner.title && <p className="text-white font-black text-base sm:text-xl leading-tight line-clamp-2">{banner.title}</p>}
                    {banner.subtitle && <p className="text-white/90 text-xs sm:text-sm mt-1 line-clamp-1">{banner.subtitle}</p>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
