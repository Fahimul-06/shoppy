import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingBag, Tag, ChevronRight, ArrowLeft } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { api } from '../lib/api';
import ProductRail from '../components/ProductRail';
import { useProducts } from '../hooks/useProducts';
import { getBestSellingProducts } from '../utils/productCollections';

export default function CartPage() {
  const { state, removeItem, updateQuantity, totalItems } = useCart();
  const [coupon, setCoupon] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponMessage, setCouponMessage] = useState('');
  const [promoInfo, setPromoInfo] = useState<{ code: string; discount: number; eligibleItemCount?: number } | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>(() => state.items.map((item) => item.product.id));
  const { products } = useProducts();

  useEffect(() => {
    setSelectedIds((current) => {
      const availableIds = state.items.map((item) => item.product.id);
      const availableSet = new Set(availableIds);
      const kept = current.filter((id) => availableSet.has(id));
      const newIds = availableIds.filter((id) => !current.includes(id));
      return [...kept, ...newIds];
    });
  }, [state.items]);

  const selectedItems = useMemo(
    () => state.items.filter((item) => selectedIds.includes(item.product.id)),
    [state.items, selectedIds]
  );
  const selectedTotalItems = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  const selectedTotalPrice = selectedItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const discount = promoInfo?.discount || 0;
  const shipping = selectedTotalPrice > 2000 ? 0 : 120;
  const finalTotal = selectedTotalPrice - discount + shipping;
  const allSelected = state.items.length > 0 && selectedIds.length === state.items.length;
  const bestSellingProducts = useMemo(() => getBestSellingProducts(products, 12), [products]);

  const applyCoupon = async () => {
    const code = coupon.trim().toUpperCase();
    if (!code) {
      setCouponMessage('Enter a coupon code first.');
      return;
    }
    if (selectedItems.length === 0) {
      setCouponMessage('Select at least one product before applying coupon.');
      return;
    }
    setCouponLoading(true);
    setCouponMessage('');
    try {
      const response = await api.post<{ promo: { code: string }; discount: number; eligibleItemCount: number }>('/promos/validate', {
        code,
        items: selectedItems.map(({ product, quantity }) => ({
          product_id: product.baseProductId || product.id,
          product_snapshot: product as unknown as Record<string, unknown>,
          quantity,
          unit_price: product.price,
        })),
      });
      setPromoInfo({ code: response.promo.code, discount: response.discount, eligibleItemCount: response.eligibleItemCount });
      setCoupon(response.promo.code);
      setCouponMessage(`Coupon applied to ${response.eligibleItemCount || selectedItems.length} product(s).`);
    } catch (error) {
      setPromoInfo(null);
      setCouponMessage(error instanceof Error ? error.message : 'Coupon could not be applied.');
    } finally {
      setCouponLoading(false);
    }
  };

  const toggleSelection = (productId: string) => {
    setSelectedIds((current) =>
      current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId]
    );
    setPromoInfo(null);
    setCouponMessage('Coupon removed because selected products changed. Apply again if needed.');
  };

  const toggleAll = () => {
    setSelectedIds(allSelected ? [] : state.items.map((item) => item.product.id));
    setPromoInfo(null);
    setCouponMessage('Coupon removed because selected products changed. Apply again if needed.');
  };

  const saveCheckoutSelection = () => {
    localStorage.setItem('checkoutItemIds', JSON.stringify(selectedIds));
    if (promoInfo?.code) localStorage.setItem('checkoutPromoCode', promoInfo.code);
    else localStorage.removeItem('checkoutPromoCode');
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link to="/" className="w-9 h-9 bg-white border border-gray-200 rounded-xl flex items-center justify-center hover:border-orange-300 transition-colors">
            <ArrowLeft size={16} className="text-gray-600" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">My Cart</h1>
          {totalItems > 0 && (
            <span className="bg-orange-100 text-orange-600 text-sm font-bold px-2.5 py-0.5 rounded-full">
              {totalItems} items
            </span>
          )}
        </div>

        {state.items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
            <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag size={32} className="text-orange-300" />
            </div>
            <p className="text-xl font-semibold text-gray-800 mb-1">Your cart is empty</p>
            <p className="text-gray-400 text-sm mb-6">Looks like you haven't added anything yet</p>
            <Link to="/" className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-3 rounded-xl transition-colors">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Items list */}
            <div className="lg:col-span-2 space-y-3">
              <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
                <label className="flex items-center gap-3 text-sm font-semibold text-gray-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="w-4 h-4 accent-orange-500"
                  />
                  Select all products for checkout
                </label>
                <span className="text-xs text-gray-500">{selectedTotalItems} selected</span>
              </div>
              {state.items.map(({ product, quantity }) => (
                <div key={product.id} className={`bg-white rounded-2xl border p-4 flex gap-4 transition-colors ${selectedIds.includes(product.id) ? 'border-orange-200 ring-1 ring-orange-100' : 'border-gray-100'}`}>
                  <label className="pt-9 flex-shrink-0" aria-label={`Select ${product.name}`}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(product.id)}
                      onChange={() => toggleSelection(product.id)}
                      className="w-4 h-4 accent-orange-500"
                    />
                  </label>
                  <Link to={`/product/${product.baseProductId || product.id}`} className="w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <Link to={`/product/${product.baseProductId || product.id}`} className="text-sm font-medium text-gray-800 hover:text-orange-500 transition-colors line-clamp-2 leading-snug">
                        {product.name}
                      </Link>
                      <button onClick={() => removeItem(product.id)} className="flex-shrink-0 w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    {product.brand && <p className="text-xs text-gray-400 mt-0.5">{product.brand}</p>}
                    {(product.selectedColor || product.selectedSize) && (
                      <p className="text-xs text-orange-600 font-semibold mt-1">
                        {[product.selectedColor && `Colour: ${product.selectedColor}`, product.selectedSize && `Size: ${product.selectedSize}`].filter(Boolean).join(' • ')}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                        <button onClick={() => updateQuantity(product.id, quantity - 1)} className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors">
                          <Minus size={13} />
                        </button>
                        <span className="w-8 text-center text-sm font-semibold text-gray-800">{quantity}</span>
                        <button onClick={() => updateQuantity(product.id, quantity + 1)} className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors">
                          <Plus size={13} />
                        </button>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">৳{(product.price * quantity).toLocaleString()}</p>
                        {quantity > 1 && <p className="text-xs text-gray-400">৳{product.price.toLocaleString()} each</p>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <Link to="/category/all" className="flex items-center gap-2 text-sm text-orange-500 hover:text-orange-600 font-semibold py-2 transition-colors">
                <ArrowLeft size={15} />
                Continue Shopping
              </Link>
            </div>

            {/* Order summary */}
            <div className="space-y-4">
              {/* Coupon */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Tag size={16} className="text-orange-500" />
                  <h3 className="font-semibold text-gray-900">Coupon Code</h3>
                </div>
                {promoInfo ? (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
                    <span className="text-green-700 font-semibold text-sm">{promoInfo.code} applied!</span>
                    <button onClick={() => { setPromoInfo(null); setCoupon(''); setCouponMessage(''); localStorage.removeItem('checkoutPromoCode'); }} className="text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={coupon}
                      onChange={(e) => setCoupon(e.target.value)}
                      placeholder="Enter coupon code"
                      onKeyDown={(e) => e.key === 'Enter' && applyCoupon()}
                      className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400 transition-colors"
                    />
                    <button onClick={applyCoupon} disabled={couponLoading || selectedItems.length === 0} className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
                      {couponLoading ? '...' : 'Apply'}
                    </button>
                  </div>
                )}
                {couponMessage && (
                  <p className={`text-xs mt-2 ${promoInfo ? 'text-green-600' : 'text-red-500'}`}>{couponMessage}</p>
                )}
                <p className="text-xs text-gray-400 mt-2">Use any active voucher/coupon from the Vouchers & Coupons page.</p>
              </div>

              {/* Summary */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3 className="font-bold text-gray-900 mb-4">Order Summary</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Selected subtotal ({selectedTotalItems} items)</span>
                    <span className="font-medium text-gray-800">৳{selectedTotalPrice.toLocaleString()}</span>
                  </div>
                  {promoInfo && (
                    <div className="flex justify-between text-green-600">
                      <span>Coupon discount ({promoInfo.code})</span>
                      <span className="font-medium">-৳{discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping</span>
                    <span className={`font-medium ${shipping === 0 ? 'text-green-600' : 'text-gray-800'}`}>
                      {shipping === 0 ? 'FREE' : `৳${shipping}`}
                    </span>
                  </div>
                  {shipping === 0 && (
                    <p className="text-xs text-green-600 bg-green-50 px-2.5 py-1.5 rounded-lg">
                      Free delivery on orders over ৳2,000
                    </p>
                  )}
                  <div className="border-t border-gray-100 pt-3 flex justify-between">
                    <span className="font-bold text-gray-900">Total</span>
                    <span className="font-bold text-xl text-gray-900">৳{finalTotal.toLocaleString()}</span>
                  </div>
                </div>

                <Link
                  to={selectedIds.length > 0 ? '/checkout' : '#'}
                  onClick={(e) => {
                    if (selectedIds.length === 0) {
                      e.preventDefault();
                      return;
                    }
                    saveCheckoutSelection();
                  }}
                  className={`mt-5 w-full font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors active:scale-95 ${selectedIds.length > 0 ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                >
                  Checkout selected products
                  <ChevronRight size={16} />
                </Link>
                {selectedIds.length === 0 && (
                  <p className="text-xs text-red-500 mt-2 text-center">Select at least one product to place an order.</p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-8">
          <ProductRail
            title="Best Selling Products"
            subtitle="Popular items customers are buying now"
            products={bestSellingProducts}
          />
        </div>
      </div>
    </div>
  );
}
