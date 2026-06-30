import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Star, ShoppingCart, Heart, Loader2, Store } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { Product } from '../types';
import { fetchWishlistStatus, toggleWishlist } from '../lib/db';
import { getToken } from '../lib/api';
import { getDisplayOriginalPrice, getSaleDiscount, getSalePrice, withSalePricing } from '../utils/salePricing';
import { defaultPlatformSettings, fetchPublicPlatformSettings, getProductFrameImage, type PlatformSettings } from '../lib/platformSettings';

const badgeStyles: Record<string, string> = {
  sale: 'bg-red-500 text-white',
  hot: 'bg-orange-500 text-white',
  new: 'bg-green-500 text-white',
};

interface Props {
  product: Product;
}

let cachedPlatformSettings: PlatformSettings | null = null;
let platformSettingsPromise: Promise<PlatformSettings> | null = null;

function loadProductFrameSettings() {
  if (cachedPlatformSettings) return Promise.resolve(cachedPlatformSettings);
  if (!platformSettingsPromise) {
    platformSettingsPromise = fetchPublicPlatformSettings()
      .then((settings) => {
        cachedPlatformSettings = settings;
        return settings;
      })
      .catch(() => defaultPlatformSettings);
  }
  return platformSettingsPromise;
}

const getSeller = (product: Product) => (product.seller && typeof product.seller === 'object' ? product.seller : null);
const shopLogo = (product: Product) => getSeller(product)?.shopLogo || '';
const shopName = (product: Product) => getSeller(product)?.shopName || getSeller(product)?.name || '';

export default function ProductCard({ product }: Props) {
  const { addItem } = useCart();
  const navigate = useNavigate();
  const [wishlisted, setWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(cachedPlatformSettings || defaultPlatformSettings);
  const sellerLogo = shopLogo(product);
  const sellerShopName = shopName(product);
  const sellerId = getSeller(product)?.id || getSeller(product)?._id || '';
  const displayPrice = getSalePrice(product);
  const displayOriginalPrice = getDisplayOriginalPrice(product);
  const displayDiscount = getSaleDiscount(product);
  const frameImage = getProductFrameImage(product, platformSettings);

  useEffect(() => {
    let alive = true;
    loadProductFrameSettings().then((settings) => { if (alive) setPlatformSettings(settings); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const token = getToken('user');
    if (!token || !product.id) return;
    fetchWishlistStatus(product.id).then(setWishlisted).catch(() => setWishlisted(false));
  }, [product.id]);

  const onWishlist = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!getToken('user')) {
      navigate('/account');
      return;
    }
    setWishlistLoading(true);
    try {
      const next = await toggleWishlist(product.id);
      setWishlisted(next);
      window.dispatchEvent(new CustomEvent('wishlist:changed', { detail: { productId: product.id, wishlisted: next } }));
    } finally {
      setWishlistLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-lg hover:border-orange-200 transition-all duration-200 group flex flex-col">
      <Link to={`/product/${product.id}`} className="relative overflow-hidden bg-gray-50 block" style={{ paddingTop: '75%' }}>
        <img
          src={product.image}
          alt={product.name}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {frameImage && (
          <span className="absolute top-2 left-2 z-30 w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden pointer-events-none drop-shadow-md bg-white/10">
            <img
              src={frameImage}
              alt="Product frame"
              className="w-full h-full object-contain"
            />
          </span>
        )}
        {product.badge && (
          <span className={`absolute ${frameImage ? 'top-[4.75rem]' : 'top-2'} left-2 z-30 text-xs font-bold px-2 py-0.5 rounded-lg uppercase ${badgeStyles[product.badge]}`}>
            {product.badge}
          </span>
        )}
        {displayDiscount > 0 && (
          <span className="absolute top-2 right-2 z-30 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-lg">
            -{displayDiscount}%
          </span>
        )}
        <button
          onClick={onWishlist}
          disabled={wishlistLoading}
          title={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          className={`absolute bottom-2 right-2 z-30 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md transition-all hover:bg-red-50 hover:text-red-500 ${wishlisted ? 'opacity-100 text-red-500' : 'opacity-0 group-hover:opacity-100'}`}
        >
          {wishlistLoading ? <Loader2 size={14} className="animate-spin"/> : <Heart size={15} className={wishlisted ? 'fill-red-500' : ''} />}
        </button>
      </Link>

      <div className="p-3 flex flex-col flex-1">
        {sellerShopName && sellerId && (
          <Link to={`/shop/${sellerId}`} className="mb-2 flex items-center gap-2 rounded-xl bg-gray-50 border border-gray-100 px-2 py-1.5 hover:border-orange-200 hover:bg-orange-50 transition" onClick={(e) => e.stopPropagation()}>
            {sellerLogo ? (
              <img src={sellerLogo} alt={sellerShopName} className="w-6 h-6 rounded-full object-cover bg-white border" />
            ) : (
              <span className="w-6 h-6 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center border border-orange-100"><Store size={13}/></span>
            )}
            <span className="text-[11px] font-bold text-gray-600 truncate">{sellerShopName}</span>
          </Link>
        )}

        <Link to={`/product/${product.id}`} className="flex-1">
          <h3 className="text-sm text-gray-800 font-medium line-clamp-2 mb-2 leading-snug hover:text-orange-500 transition-colors">
            {product.name}
          </h3>
        </Link>

        <div className="flex items-center gap-1 mb-2">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              size={12}
              className={i < Math.floor(product.rating ?? 0) ? 'text-orange-400 fill-orange-400' : 'text-gray-200 fill-gray-200'}
            />
          ))}
          <span className="text-xs text-gray-500 ml-1">({Number(product.reviewCount ?? 0).toLocaleString()})</span>
        </div>

        <div className="flex items-end gap-2 mb-3">
          <span className="text-base font-bold text-gray-900">৳{Number(displayPrice ?? 0).toLocaleString()}</span>
          {displayOriginalPrice && (
            <span className="text-xs text-gray-400 line-through">৳{Number(displayOriginalPrice).toLocaleString()}</span>
          )}
        </div>

        <button
          onClick={() => addItem(withSalePricing(product))}
          className="w-full bg-orange-50 hover:bg-orange-500 text-orange-500 hover:text-white border border-orange-200 hover:border-orange-500 text-sm font-semibold py-2 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 active:scale-95"
        >
          <ShoppingCart size={15} />
          Add to Cart
        </button>
      </div>
    </div>
  );
}
