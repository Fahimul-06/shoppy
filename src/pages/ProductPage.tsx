import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, ShoppingCart, Heart, Share2, Shield, Truck, RotateCcw, ChevronRight, Minus, Plus, Check } from 'lucide-react';
import { products } from '../data/products';
import { useCart } from '../context/CartContext';
import ProductCard from '../components/ProductCard';

const mockReviews = [
  { id: '1', author: 'Rahim Ahmed', rating: 5, date: '2024-03-10', comment: 'Excellent product! Exactly as described. Fast delivery and well packed.', verified: true },
  { id: '2', author: 'Fatema Khatun', rating: 4, date: '2024-02-28', comment: 'Good quality, satisfied with the purchase. Would recommend to others.', verified: true },
  { id: '3', author: 'Karim Hassan', rating: 5, date: '2024-02-15', comment: 'Amazing! Super fast delivery. The product exceeded my expectations.', verified: true },
  { id: '4', author: 'Sumaiya Islam', rating: 4, date: '2024-01-30', comment: 'Great value for the price. Product is exactly what I needed.', verified: false },
];

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const { addItem } = useCart();
  const product = products.find((p) => p.id === id);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'description' | 'specs' | 'reviews'>('description');
  const [added, setAdded] = useState(false);

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
  const related = products.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 5);

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) addItem(product);
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

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} className={i < Math.floor(product.rating) ? 'text-orange-400 fill-orange-400' : 'text-gray-200 fill-gray-200'} />
                ))}
              </div>
              <span className="text-sm font-semibold text-gray-700">{product.rating}</span>
              <span className="text-sm text-gray-500">({product.reviewCount.toLocaleString()} reviews)</span>
            </div>

            <div className="bg-orange-50 rounded-2xl p-4">
              <div className="flex items-end gap-3">
                <span className="text-3xl font-bold text-gray-900">৳{product.price.toLocaleString()}</span>
                {product.originalPrice && (
                  <span className="text-lg text-gray-400 line-through mb-0.5">৳{product.originalPrice.toLocaleString()}</span>
                )}
                {product.discount && (
                  <span className="bg-red-500 text-white text-sm font-bold px-2.5 py-1 rounded-lg mb-0.5">
                    -{product.discount}% OFF
                  </span>
                )}
              </div>
              {product.originalPrice && (
                <p className="text-green-600 text-sm font-semibold mt-1">
                  You save ৳{(product.originalPrice - product.price).toLocaleString()}
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
              onClick={() => addItem(product)}
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
                {tab === 'specs' ? 'Specifications' : tab === 'reviews' ? `Reviews (${mockReviews.length})` : tab}
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
                    <div className="text-5xl font-bold text-gray-900">{product.rating}</div>
                    <div className="flex items-center justify-center gap-0.5 my-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={14} className={i < Math.floor(product.rating) ? 'text-orange-400 fill-orange-400' : 'text-gray-200 fill-gray-200'} />
                      ))}
                    </div>
                    <div className="text-xs text-gray-500">{product.reviewCount.toLocaleString()} reviews</div>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const pct = star === 5 ? 68 : star === 4 ? 20 : star === 3 ? 8 : star === 2 ? 3 : 1;
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
                {mockReviews.map((review) => (
                  <div key={review.id} className="pb-5 border-b border-gray-50 last:border-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-sm">
                          {review.author[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-gray-800">{review.author}</p>
                          {review.verified && <span className="text-xs text-green-600 font-medium">Verified Purchase</span>}
                        </div>
                      </div>
                      <span className="text-xs text-gray-400">{review.date}</span>
                    </div>
                    <div className="flex items-center gap-0.5 mb-1.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={13} className={i < review.rating ? 'text-orange-400 fill-orange-400' : 'text-gray-200 fill-gray-200'} />
                      ))}
                    </div>
                    <p className="text-sm text-gray-700">{review.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Related Products</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {related.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
