import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingBag, Tag, ChevronRight, ArrowLeft } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { validatePromoCode } from '../lib/db';

export default function CartPage() {
  const { state, removeItem, updateQuantity, totalPrice, totalItems } = useCart();
  const [coupon, setCoupon] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponMessage, setCouponMessage] = useState('');
  const [discount, setDiscount] = useState(0);
  const shipping = totalPrice > 2000 ? 0 : 120;
  const finalTotal = totalPrice - discount + shipping;

  const applyCoupon = async () => {
    setCouponMessage('');
    const code = coupon.trim();
    if (!code) return;
    const result = await validatePromoCode(code, totalPrice, state.items.map(({ product, quantity }) => ({
      product_id: product.id,
      product_snapshot: product as unknown as Record<string, unknown>,
      quantity,
      unit_price: product.price,
      total_price: product.price * quantity,
    })));
    if (!result.valid) {
      setCouponApplied(false);
      setDiscount(0);
      setCouponMessage(result.message || 'Invalid coupon code');
      return;
    }
    setCouponApplied(true);
    setDiscount(Number(result.discount_amount || 0));
    setCouponMessage(`${result.code || code.toUpperCase()} applied!`);
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
              {state.items.map(({ product, quantity }) => (
                <div key={product.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-4">
                  <Link to={`/product/${product.id}`} className="w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <Link to={`/product/${product.id}`} className="text-sm font-medium text-gray-800 hover:text-orange-500 transition-colors line-clamp-2 leading-snug">
                        {product.name}
                      </Link>
                      <button onClick={() => removeItem(product.id)} className="flex-shrink-0 w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    {product.brand && <p className="text-xs text-gray-400 mt-0.5">{product.brand}</p>}
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
                {couponApplied ? (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
                    <span className="text-green-700 font-semibold text-sm">{couponMessage || 'Coupon applied!'}</span>
                    <button onClick={() => { setCouponApplied(false); setCoupon(''); setDiscount(0); setCouponMessage(''); }} className="text-gray-400 hover:text-red-500 transition-colors">
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
                    <button onClick={applyCoupon} className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
                      Apply
                    </button>
                  </div>
                )}
                {couponMessage && !couponApplied ? <p className="text-xs text-red-500 mt-2">{couponMessage}</p> : null}
                <p className="text-xs text-gray-400 mt-2">Try: <span className="font-mono font-semibold text-gray-600">CARTUP10</span></p>
              </div>

              {/* Summary */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3 className="font-bold text-gray-900 mb-4">Order Summary</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal ({totalItems} items)</span>
                    <span className="font-medium text-gray-800">৳{totalPrice.toLocaleString()}</span>
                  </div>
                  {couponApplied && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
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
                  to="/checkout"
                  className="mt-5 w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors active:scale-95"
                >
                  Proceed to Checkout
                  <ChevronRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
