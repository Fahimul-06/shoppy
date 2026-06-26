import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, ChevronRight, MapPin, CreditCard, Package } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { placeOrder as saveOrder } from '../lib/db';

const steps = ['Delivery Address', 'Payment Method', 'Confirmation'];

const paymentMethods = [
  { id: 'bkash', label: 'bKash', color: 'bg-pink-500' },
  { id: 'nagad', label: 'Nagad', color: 'bg-orange-500' },
  { id: 'card', label: 'Credit / Debit Card', color: 'bg-blue-500' },
  { id: 'cod', label: 'Cash on Delivery', color: 'bg-green-500' },
];

export default function CheckoutPage() {
  const { state, totalPrice, clearCart } = useCart();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [payment, setPayment] = useState('bkash');
  const [address, setAddress] = useState({ name: '', phone: '', division: '', district: '', area: '', address: '' });
  const [ordered, setOrdered] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [orderNumber, setOrderNumber] = useState('');

  const shipping = totalPrice > 2000 ? 0 : 120;
  const total = totalPrice + shipping;

  const placeOrder = async () => {
    setError('');
    if (!address.name.trim() || !address.phone.trim() || !address.address.trim()) {
      setError('Please fill in your name, phone number, and street address.');
      setStep(0);
      return;
    }
    setSubmitting(true);
    try {
      const order = await saveOrder({
        subtotal: totalPrice,
        discount_amount: 0,
        delivery_fee: shipping,
        total_amount: total,
        payment_method: payment,
        shipping_address: address,
        items: state.items.map(({ product, quantity }) => ({
          product_id: product.id,
          product_snapshot: product as unknown as Record<string, unknown>,
          quantity,
          unit_price: product.price,
          total_price: product.price * quantity,
        })),
      }) as Record<string, unknown>;
      setOrderNumber(String(order.order_number || order.id || 'confirmed'));
      clearCart();
      setOrdered(true);
      setStep(2);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not place order';
      if (message.toLowerCase().includes('authenticated')) {
        setError('Please login or create an account before placing the order.');
        navigate('/account');
      } else {
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (state.items.length === 0 && !ordered) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Package size={48} className="text-gray-300" />
        <p className="text-gray-500">Your cart is empty.</p>
        <Link to="/" className="bg-orange-500 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-orange-600 transition-colors">
          Shop Now
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Progress steps */}
        <div className="flex items-center justify-center gap-0 mb-8">
          {steps.map((s, i) => (
            <React.Fragment key={s}>
              <div className="flex flex-col items-center gap-1.5">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                  i < step ? 'bg-green-500 text-white' : i === step ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {i < step ? <Check size={16} /> : i + 1}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${i === step ? 'text-orange-500' : i < step ? 'text-green-600' : 'text-gray-400'}`}>
                  {s}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`h-0.5 w-16 sm:w-24 mx-1 transition-colors ${i < step ? 'bg-green-500' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main form */}
          <div className="lg:col-span-2">
            {step === 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-5">
                  <MapPin size={18} className="text-orange-500" />
                  <h2 className="text-lg font-bold text-gray-900">Delivery Address</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { key: 'name', label: 'Full Name', placeholder: 'Your full name', col: 1 },
                    { key: 'phone', label: 'Phone Number', placeholder: '01XXXXXXXXX', col: 1 },
                    { key: 'division', label: 'Division', placeholder: 'e.g. Dhaka', col: 1 },
                    { key: 'district', label: 'District', placeholder: 'e.g. Dhaka City', col: 1 },
                    { key: 'area', label: 'Area / Upazilla', placeholder: 'e.g. Dhanmondi', col: 1 },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
                      <input
                        type="text"
                        value={address[key as keyof typeof address]}
                        onChange={(e) => setAddress({ ...address, [key]: e.target.value })}
                        placeholder={placeholder}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 transition-colors"
                      />
                    </div>
                  ))}
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Street Address</label>
                    <textarea
                      value={address.address}
                      onChange={(e) => setAddress({ ...address, address: e.target.value })}
                      placeholder="House no, road, block, sector..."
                      rows={3}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 transition-colors resize-none"
                    />
                  </div>
                </div>
                <button
                  onClick={() => { setError(''); if (!address.name.trim() || !address.phone.trim() || !address.address.trim()) setError('Please fill in your name, phone number, and street address.'); else setStep(1); }}
                  className="mt-5 w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors active:scale-95"
                >
                  Continue to Payment
                  <ChevronRight size={16} />
                </button>
                {error && step === 0 ? <p className="text-sm text-red-500 mt-3">{error}</p> : null}
              </div>
            )}

            {step === 1 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-5">
                  <CreditCard size={18} className="text-orange-500" />
                  <h2 className="text-lg font-bold text-gray-900">Payment Method</h2>
                </div>
                <div className="space-y-3">
                  {paymentMethods.map((m) => (
                    <label key={m.id} className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-colors ${payment === m.id ? 'border-orange-400 bg-orange-50' : 'border-gray-100 hover:border-gray-200'}`}>
                      <input type="radio" name="payment" value={m.id} checked={payment === m.id} onChange={() => setPayment(m.id)} className="accent-orange-500" />
                      <div className={`w-10 h-10 ${m.color} rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                        {m.id === 'card' ? <CreditCard size={18} /> : m.label.slice(0, 2)}
                      </div>
                      <span className="font-semibold text-gray-800">{m.label}</span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-3 mt-5">
                  <button onClick={() => setStep(0)} className="flex-1 border border-gray-200 text-gray-700 font-semibold py-3 rounded-xl hover:border-gray-300 transition-colors">
                    Back
                  </button>
                  <button disabled={submitting} onClick={placeOrder} className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold py-3 rounded-xl transition-colors active:scale-95">
                    {submitting ? 'Placing...' : 'Place Order'}
                  </button>
                </div>
                {error && step === 1 ? <p className="text-sm text-red-500 mt-3">{error}</p> : null}
              </div>
            )}

            {step === 2 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
                  <Check size={36} className="text-green-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Placed!</h2>
                <p className="text-gray-500 mb-1">Thank you for your order.</p>
                <p className="text-gray-500 text-sm mb-6">
                  Order <span className="font-bold text-gray-800">#{orderNumber}</span> has been confirmed.
                </p>
                <p className="text-sm text-gray-500 mb-6">
                  You will receive a confirmation SMS at your registered number shortly.
                </p>
                <Link to="/" className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-3 rounded-xl transition-colors">
                  Continue Shopping
                </Link>
              </div>
            )}
          </div>

          {/* Order summary sidebar */}
          {step < 2 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 h-fit">
              <h3 className="font-bold text-gray-900 mb-4">Order Summary</h3>
              <div className="space-y-3 mb-4">
                {state.items.map(({ product, quantity }) => (
                  <div key={product.id} className="flex gap-3">
                    <img src={product.image} alt={product.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0 bg-gray-50" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-700 font-medium line-clamp-2 leading-snug">{product.name}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-gray-400">Qty: {quantity}</span>
                        <span className="text-xs font-bold text-gray-800">৳{(product.price * quantity).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 pt-3 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>৳{totalPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  <span className={shipping === 0 ? 'text-green-600' : ''}>{shipping === 0 ? 'FREE' : `৳${shipping}`}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-100">
                  <span>Total</span>
                  <span>৳{total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
