import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, ShoppingCart, Heart, Share2, Shield, Truck, RotateCcw, ChevronRight, Minus, Plus, Check, Store } from 'lucide-react';
import { useCart } from '../context/CartContext';
import ProductCard from '../components/ProductCard';
import type { Product } from '../types';
import { fetchProductById, fetchProductReviews, fetchRelatedProducts } from '../lib/db';
import { useProducts } from '../hooks/useProducts';
import { getDisplayOriginalPrice, getSaleDiscount, getSalePrice, withSalePricing } from '../utils/salePricing';

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const { addItem } = useCart();
  const { products } = useProducts();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [activeTab, setActiveTab] = useState<'description' | 'specs' | 'reviews'>('description');
  const [added, setAdded] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewDistribution, setReviewDistribution] = useState<Record<string, number>>({});
  const [reviewsLoading, setReviewsLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setRelatedProducts([]);
    setReviews([]);
    setReviewDistribution({});
    setActiveImage(0);
    if (!id) {
      setProduct(null);
      setLoading(false);
      return;
    }
    fetchProductById(id)
      .then((row) => { if (alive) setProduct(row); })
      .catch(() => { if (alive) setProduct(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id]);

  useEffect(() => {
    let alive = true;
    if (!product?.id) return;
    setRelatedLoading(true);
    fetchRelatedProducts(product.id)
      .then((rows) => { if (alive) setRelatedProducts(rows || []); })
      .catch(() => { if (alive) setRelatedProducts([]); })
      .finally(() => { if (alive) setRelatedLoading(false); });
    return () => { alive = false; };
  }, [product?.id]);

  useEffect(() => {
    let alive = true;
    if (!product?.id) return;
    setReviewsLoading(true);
    fetchProductReviews(product.id)
      .then((data) => {
        if (!alive) return;
        setReviews(data.reviews || []);
        setReviewDistribution(data.distribution || {});
      })
      .catch(() => { if (alive) { setReviews([]); setReviewDistribution({}); } })
      .finally(() => { if (alive) setReviewsLoading(false); });
    return () => { alive = false; };
  }, [product?.id]);

  useEffect(() => {
    setSelectedColor('');
    setSelectedSize('');
    setActiveImage(0);
  }, [product?.id]);

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center text-gray-400">Loading product...</div>;
  }

  if (!product) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <p className="text-gray-500 text-lg mb-4">Product not found.</p>
        <Link to="/" className="bg-orange-500 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-orange-600 transition-colors">
          Back to Home
        </Link>
      </div>
    );
  }

  const images = product.images?.length ? product.images : [product.image];
  const displayPrice = getSalePrice(product);
  const displayOriginalPrice = getDisplayOriginalPrice(product);
  const displayDiscount = getSaleDiscount(product);
  const productForCart = withSalePricing(product);
  const colorOptions = Array.isArray(product.colorOptions) ? product.colorOptions.filter(Boolean) : [];
  const sizeOptions = Array.isArray(product.sizeOptions) ? product.sizeOptions.filter(Boolean) : [];
  const variantKey = `${product.id}::${selectedColor || 'no-color'}::${selectedSize || 'no-size'}`;
  const productForCartWithOptions = { ...productForCart, id: variantKey, baseProductId: product.id, selectedColor, selectedSize };

  const seller = product.seller && typeof product.seller === 'object' ? product.seller : null;
  const sellerShopLogo = seller?.shopLogo || '';
  const sellerShopName = seller?.shopName || seller?.name || '';
  const sellerName = seller?.name || '';
  const sellerId = seller?.id || seller?._id || '';
  const normalize = (value?: string) => String(value || '').trim().toLowerCase();
  const colorToCss = (value: string) => {
    const key = normalize(value).replace(/\s+/g, ' ');
    const map: Record<string, string> = {
      black: '#111827', white: '#ffffff', red: '#ef4444', blue: '#2563eb', 'navy blue': '#1e3a8a', 'sky blue': '#38bdf8',
      green: '#22c55e', yellow: '#facc15', orange: '#f97316', pink: '#ec4899', purple: '#9333ea', brown: '#92400e',
      grey: '#9ca3af', gray: '#9ca3af', beige: '#e7d8bd', maroon: '#7f1d1d', gold: '#d4af37', silver: '#c0c0c0'
    };
    if (map[key]) return map[key];
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim())) return value.trim();
    return 'linear-gradient(135deg,#f97316,#ec4899,#2563eb)';
  };
  const clientRelated = products
    .filter((p) => p.id !== product.id)
    .map((p) => {
      let score = 0;
      if (normalize(p.childCategory) && normalize(p.childCategory) === normalize(product.childCategory)) score += 50;
      if (normalize(p.subcategory) && normalize(p.subcategory) === normalize(product.subcategory)) score += 40;
      if (normalize(p.category) && normalize(p.category) === normalize(product.category)) score += 30;
      if (normalize(p.brand) && normalize(p.brand) === normalize(product.brand)) score += 10;
      return { product: p, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((item) => item.product);
  const related = (relatedProducts.length ? relatedProducts : clientRelated).filter((p) => p.id !== product.id).slice(0, 10);

  const handleAddToCart = () => {
    if (colorOptions.length && !selectedColor) { alert('Please choose a colour.'); return; }
    if (sizeOptions.length && !selectedSize) { alert('Please choose a size.'); return; }
    for (let i = 0; i < quantity; i++) addItem(productForCartWithOptions);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-6">
          <Link to="/" className="hover:text-orange-500 transition-colors">Home</Link>
          <ChevronRight size={14} />
          <Link to={`/category/${product.category}`} className="hover:text-orange-500 transition-colors capitalize">
            {product.category.replace(/-/g, ' ')}
          </Link>
          <ChevronRight size={14} />
          <span className="text-gray-800 line-clamp-1">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          {/* Image Gallery */}
          <div className="space-y-3">
            <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 aspect-square">
              <img
                src={images[activeImage]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            {images.length > 1 && (
              <div className="flex gap-2">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-colors ${
                      i === activeImage ? 'border-orange-500' : 'border-gray-200 hover:border-orange-300'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-4">
            {product.brand && (
              <Link to={`/search?q=${product.brand}`} className="text-orange-500 text-sm font-semibold hover:underline">
                {product.brand}
              </Link>
            )}
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">{product.name}</h1>

            {sellerShopName && sellerId && (
              <Link to={`/shop/${sellerId}`} className="flex items-center gap-3 rounded-2xl bg-white border border-gray-100 p-3 shadow-sm hover:border-orange-200 hover:bg-orange-50 transition">
                {sellerShopLogo ? (
                  <img src={sellerShopLogo} alt={sellerShopName} className="w-12 h-12 rounded-full object-cover bg-gray-100 border" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center border border-orange-100"><Store size={20} /></div>
                )}
                <div>
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Visit Seller Shop</p>
                  <p className="text-sm font-black text-gray-900">{sellerShopName}</p>
                  {sellerName && <p className="text-xs text-gray-500">Seller: {sellerName}</p>}
                </div>
              </Link>
            )}

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} className={i < Math.floor((product.rating ?? 0)) ? 'text-orange-400 fill-orange-400' : 'text-gray-200 fill-gray-200'} />
                ))}
              </div>
              <span className="text-sm font-semibold text-gray-700">{(product.rating ?? 0)}</span>
              <span className="text-sm text-gray-500">({Number(product.reviewCount ?? 0).toLocaleString()} reviews)</span>
            </div>

            <div className="bg-orange-50 rounded-2xl p-4">
              <div className="flex items-end gap-3">
                <span className="text-3xl font-bold text-gray-900">৳{Number(displayPrice ?? 0).toLocaleString()}</span>
                {displayOriginalPrice && (
                  <span className="text-lg text-gray-400 line-through mb-0.5">৳{Number(displayOriginalPrice).toLocaleString()}</span>
                )}
                {displayDiscount > 0 && (
                  <span className="bg-red-500 text-white text-sm font-bold px-2.5 py-1 rounded-lg mb-0.5">
                    -{displayDiscount}% OFF
                  </span>
                )}
              </div>
              {displayOriginalPrice && (
                <p className="text-green-600 text-sm font-semibold mt-1">
                  You save ৳{(Number(displayOriginalPrice) - Number(displayPrice ?? 0)).toLocaleString()}
                </p>
              )}
            </div>

            {/* Features */}
            {product.features && (
              <div className="space-y-2">
                {product.features.slice(0, 4).map((f) => (
                  <div key={f} className="flex items-center gap-2 text-sm text-gray-700">
                    <Check size={15} className="text-green-500 flex-shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
            )}

            {/* Stock */}
            {product.stock !== undefined && product.stock < 20 && (
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                <span className="text-orange-600 font-medium">Only {product.stock} left in stock</span>
              </div>
            )}

            {(colorOptions.length > 0 || sizeOptions.length > 0) && (
              <div className="space-y-5 bg-white rounded-2xl border border-gray-100 p-4">
                {colorOptions.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-bold text-gray-800">Choose Colour</p>
                      {selectedColor && <span className="text-xs font-bold text-orange-600">{selectedColor}</span>}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {colorOptions.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setSelectedColor(color)}
                          title={color}
                          aria-label={`Choose ${color}`}
                          className={`relative h-10 w-10 rounded-full border-2 shadow-sm transition hover:scale-105 ${selectedColor === color ? 'border-orange-500 ring-2 ring-orange-200' : 'border-gray-200'}`}
                          style={{ background: colorToCss(color) }}
                        >
                          {selectedColor === color && (
                            <span className="absolute inset-0 flex items-center justify-center">
                              <Check size={17} className={normalize(color) === 'white' ? 'text-gray-900' : 'text-white drop-shadow'} />
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {sizeOptions.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-bold text-gray-800">Choose Size</p>
                      {selectedSize && <span className="text-xs font-bold text-orange-600">{selectedSize}</span>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {sizeOptions.map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setSelectedSize(size)}
                          className={`min-w-11 h-11 px-3 rounded-2xl border text-sm font-black transition ${selectedSize === size ? 'border-orange-500 bg-orange-500 text-white shadow-sm' : 'border-gray-200 bg-white text-gray-700 hover:border-orange-300 hover:bg-orange-50'}`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quantity + Actions */}
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-11 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <Minus size={16} />
                </button>
                <span className="w-10 text-center font-semibold text-gray-800">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-11 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
              <button
                onClick={handleAddToCart}
                className={`flex-1 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 ${
                  added ? 'bg-green-500 text-white' : 'bg-orange-500 hover:bg-orange-600 text-white'
                }`}
              >
                {added ? <Check size={18} /> : <ShoppingCart size={18} />}
                {added ? 'Added to Cart!' : 'Add to Cart'}
              </button>
              <button className="w-11 h-11 border border-gray-200 rounded-xl flex items-center justify-center text-gray-500 hover:text-red-500 hover:border-red-200 transition-colors">
                <Heart size={18} />
              </button>
              <button className="w-11 h-11 border border-gray-200 rounded-xl flex items-center justify-center text-gray-500 hover:text-orange-500 hover:border-orange-200 transition-colors">
                <Share2 size={18} />
              </button>
            </div>

            <Link
              to="/checkout"
              onClick={(event) => { if (colorOptions.length && !selectedColor) { event.preventDefault(); alert('Please choose a colour.'); return; } if (sizeOptions.length && !selectedSize) { event.preventDefault(); alert('Please choose a size.'); return; } addItem(productForCartWithOptions); }}
              className="block w-full text-center border-2 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white font-bold py-3 rounded-xl transition-all duration-200 active:scale-95"
            >
              Buy Now
            </Link>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              {[
                { icon: Shield, text: 'Authentic Product' },
                { icon: Truck, text: 'Free Delivery' },
                { icon: RotateCcw, text: '7-Day Return' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex flex-col items-center gap-1.5 bg-gray-50 rounded-xl p-2.5 text-center">
                  <Icon size={18} className="text-orange-500" />
                  <span className="text-xs text-gray-600 font-medium">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl border border-gray-100 mb-10">
          <div className="flex border-b border-gray-100">
            {(['description', 'specs', 'reviews'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 sm:flex-none px-6 py-4 text-sm font-semibold capitalize transition-colors border-b-2 -mb-px ${
                  activeTab === tab
                    ? 'text-orange-500 border-orange-500'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                {tab === 'specs' ? 'Specifications' : tab === 'reviews' ? `Reviews (${reviews.length || Number(product.reviewCount ?? 0)})` : tab}
              </button>
            ))}
          </div>

          <div className="p-6">
            {activeTab === 'description' && (
              <div className="space-y-4">
                <p className="text-gray-700 leading-relaxed">{product.description}</p>
                {product.features && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Key Features</h3>
                    <ul className="space-y-2">
                      {product.features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-gray-700 text-sm">
                          <Check size={15} className="text-green-500 flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'specs' && product.specifications && (
              <div className="divide-y divide-gray-50">
                {Object.entries(product.specifications).map(([key, value]) => (
                  <div key={key} className="flex py-3 text-sm">
                    <span className="w-40 text-gray-500 font-medium flex-shrink-0">{key}</span>
                    <span className="text-gray-800">{value}</span>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-5">
                <div className="flex items-center gap-6 pb-5 border-b border-gray-100">
                  <div className="text-center">
                    <div className="text-5xl font-bold text-gray-900">{(product.rating ?? 0)}</div>
                    <div className="flex items-center justify-center gap-0.5 my-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={14} className={i < Math.floor((product.rating ?? 0)) ? 'text-orange-400 fill-orange-400' : 'text-gray-200 fill-gray-200'} />
                      ))}
                    </div>
                    <div className="text-xs text-gray-500">{Number(product.reviewCount ?? 0).toLocaleString()} reviews</div>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = Number(reviewDistribution[String(star)] || 0);
                      const total = reviews.length || Number(product.reviewCount ?? 0) || 0;
                      const pct = total ? Math.round((count / total) * 100) : 0;
                      return (
                        <div key={star} className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="w-3">{star}</span>
                          <Star size={11} className="text-orange-400 fill-orange-400" />
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-orange-400 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-7 text-right">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {reviewsLoading ? (
                  <div className="py-8 text-center text-gray-400">Loading customer reviews...</div>
                ) : reviews.length === 0 ? (
                  <div className="py-8 text-center text-gray-500">No customer reviews yet for this product.</div>
                ) : reviews.map((review) => {
                  const author = review.user?.fullName || review.user?.email?.split('@')?.[0] || 'Customer';
                  const photo = review.user?.profilePhoto;
                  return (
                  <div key={review.id || review._id} className="pb-5 border-b border-gray-50 last:border-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {photo ? <img src={photo} className="w-8 h-8 rounded-full object-cover bg-gray-100" /> : (
                          <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-sm">
                            {author[0]}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-sm text-gray-800">{author}</p>
                          <span className="text-xs text-green-600 font-medium">Verified Purchase</span>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400">{review.createdAt ? new Date(review.createdAt).toLocaleDateString() : ''}</span>
                    </div>
                    <div className="flex items-center gap-0.5 mb-1.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={13} className={i < review.rating ? 'text-orange-400 fill-orange-400' : 'text-gray-200 fill-gray-200'} />
                      ))}
                    </div>
                    {review.comment && <p className="text-sm text-gray-700">{review.comment}</p>}
                    {Array.isArray(review.photos) && review.photos.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {review.photos.map((url: string, index: number) => (
                          <a key={`${url}-${index}`} href={url} target="_blank" rel="noreferrer" className="block w-20 h-20 rounded-xl overflow-hidden border bg-gray-50">
                            <img src={url} alt={`Review photo ${index + 1}`} className="w-full h-full object-cover" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                );})}
              </div>
            )}
          </div>
        </div>

        {/* Related Products */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Related Products</h2>
              <p className="text-sm text-gray-500">More items from the same category, subcategory, brand, or seller.</p>
            </div>
            <Link to={`/category/${product.category || 'all'}`} className="hidden sm:inline-flex text-sm font-bold text-orange-500 hover:text-orange-600">
              View more
            </Link>
          </div>

          {relatedLoading && related.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                  <div className="aspect-[4/3] bg-gray-100" />
                  <div className="p-3 space-y-3">
                    <div className="h-3 bg-gray-100 rounded" />
                    <div className="h-3 bg-gray-100 rounded w-2/3" />
                    <div className="h-8 bg-gray-100 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : related.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {related.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center text-gray-500">
              Related products will appear here when more products are added.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
