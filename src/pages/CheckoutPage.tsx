import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, ChevronRight, MapPin, CreditCard, Package, Loader2, AlertCircle, Tag, Trash2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { placeOrder as saveOrder } from '../lib/db';
import { api, getToken } from '../lib/api';

const steps = ['Delivery Address', 'Payment Method', 'Confirmation'];

type DeliveryAddress = { id?: string; label?: string; name?: string; phone?: string; division?: string; district?: string; area?: string; address?: string; landmark?: string; latitude?: number; longitude?: number; isDefault?: boolean };

const paymentMethods = [
  { id: 'bkash', label: 'bKash', color: 'bg-pink-500' },
  { id: 'nagad', label: 'Nagad', color: 'bg-orange-500' },
  { id: 'card', label: 'Credit / Debit Card', color: 'bg-blue-500' },
  { id: 'cod', label: 'Cash on Delivery', color: 'bg-green-500' },
];

export default function CheckoutPage() {
  const { state, removeItems } = useCart();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [payment, setPayment] = useState('bkash');
  const [address, setAddress] = useState<DeliveryAddress>({ name: '', phone: '', division: '', district: '', area: '', address: '', landmark: '' });
  const [savedAddresses, setSavedAddresses] = useState<DeliveryAddress[]>([]);
  const [ordered, setOrdered] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [promoCode, setPromoCode] = useState(() => localStorage.getItem('checkoutPromoCode') || '');
  const [promoInfo, setPromoInfo] = useState<{ code: string; discount: number; eligibleItemCount?: number } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [checkoutItemIds] = useState<string[] | null>(() => {
    try {
      const stored = localStorage.getItem('checkoutItemIds');
      const parsed = stored ? JSON.parse(stored) : null;
      return Array.isArray(parsed) && parsed.length > 0 ? parsed.map(String) : null;
    } catch {
      return null;
    }
  });

  const checkoutItems = useMemo(() => {
    if (!checkoutItemIds) return state.items;
    const selected = state.items.filter((item) => checkoutItemIds.includes(item.product.id));
    return selected.length > 0 ? selected : state.items;
  }, [state.items, checkoutItemIds]);
  const checkoutTotalItems = checkoutItems.reduce((sum, item) => sum + item.quantity, 0);
  const checkoutTotalPrice = checkoutItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const shipping = checkoutTotalPrice > 2000 ? 0 : 120;
  const discount = promoInfo?.discount || 0;
  const total = Math.max(0, checkoutTotalPrice - discount) + shipping;

  const readableAddress = (addr: DeliveryAddress) => [addr.address, addr.landmark, addr.area, addr.district, addr.division].filter(Boolean).join(', ');

  useEffect(() => {
    const token = getToken('user');
    if (!token) return;
    api.get<{ user: { addresses?: DeliveryAddress[]; fullName?: string; phone?: string } }>('/auth/me', token)
      .then(({ user }) => {
        const addresses = user.addresses || [];
        setSavedAddresses(addresses);
        const preferred = addresses.find((a) => a.isDefault) || addresses[0];
        if (preferred) setAddress({ ...preferred, name: preferred.name || user.fullName || '', phone: preferred.phone || user.phone || '' });
        else setAddress((prev) => ({ ...prev, name: user.fullName || prev.name || '', phone: user.phone || prev.phone || '' }));
      })
      .catch(() => {});
  }, []);

  const applyPromo = async () => {
    const code = promoCode.trim().toUpperCase();
    if (!code) return;
    setPromoLoading(true);
    setError('');
    try {
      const response = await api.post<{ promo: any; discount: number; eligibleItemCount: number }>('/promos/validate', {
        code,
        items: checkoutItems.map(({ product, quantity }) => ({
          product_id: product.id,
          product_snapshot: product as unknown as Record<string, unknown>,
          quantity,
          unit_price: product.price,
        })),
      });
      setPromoInfo({ code: response.promo.code, discount: response.discount, eligibleItemCount: response.eligibleItemCount });
      setPromoCode(response.promo.code);
    } catch (e) {
      setPromoInfo(null);
      setError(e instanceof Error ? e.message : 'Promo could not be applied');
    } finally {
      setPromoLoading(false);
    }
  };

  useEffect(() => {
    const storedCode = localStorage.getItem('checkoutPromoCode');
    if (!storedCode || promoInfo || promoLoading || checkoutItems.length === 0) return;
    setPromoCode(storedCode);
    const timer = window.setTimeout(() => {
      applyPromo();
    }, 50);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutItems.length]);

  const placeOrder = async () => {
    if (!getToken('user')) {
      navigate('/account');
      return;
    }
    if (!address.name || !address.phone || !address.address) {
      setError('Please fill in your name, phone number, and street address.');
      setStep(0);
      return;
    }
    setPlacing(true);
    setError('');
    try {
      const order = await saveOrder({
        subtotal: checkoutTotalPrice,
        discount_amount: discount,
        promo_code: promoInfo?.code || '',
        delivery_fee: shipping,
        total_amount: total,
        payment_method: payment,
        shipping_address: address,
        items: checkoutItems.map(({ product, quantity }) => ({
          product_id: product.id,
          product_snapshot: product as unknown as Record<string, unknown>,
          quantity,
          unit_price: product.price,
          total_price: product.price * quantity,
        })),
      });
      setOrderNumber(order.orderNumber || order.id);
      removeItems(checkoutItems.map(({ product }) => product.id));
      localStorage.removeItem('checkoutItemIds');
      localStorage.removeItem('checkoutPromoCode');
      setOrdered(true);
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Order failed');
    } finally {
      setPlacing(false);
    }
  };

  if (checkoutItems.length === 0 && !ordered) {
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
                {savedAddresses.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Choose saved delivery address</label>
                    <select
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400"
                      value={address.id || ''}
                      onChange={(e) => {
                        const selected = savedAddresses.find((a) => a.id === e.target.value);
                        if (selected) setAddress(selected);
                      }}
                    >
                      <option value="">Use manual address</option>
                      {savedAddresses.map((addr) => (
                        <option key={addr.id} value={addr.id}>
                          {(addr.label || 'Address') + ' - ' + (readableAddress(addr) || addr.address || 'Saved location')}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
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
                        value={String(address[key as keyof typeof address] || '')}
                        onChange={(e) => setAddress({ ...address, [key]: e.target.value })}
                        placeholder={placeholder}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 transition-colors"
                      />
                    </div>
                  ))}
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Street Address</label>
                    <textarea
                      value={address.address || ''}
                      onChange={(e) => setAddress({ ...address, address: e.target.value })}
                      placeholder="House no, road, block, sector..."
                      rows={3}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 transition-colors resize-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Landmark / Delivery Note</label>
                    <input
                      value={address.landmark || ''}
                      onChange={(e) => setAddress({ ...address, landmark: e.target.value })}
                      placeholder="Nearby landmark, building, floor, gate, etc."
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 transition-colors"
                    />
                  </div>
                  {address.latitude && address.longitude && (
                    <p className="sm:col-span-2 text-xs bg-blue-50 text-blue-600 rounded-xl px-3 py-2">Map/current-location address selected. Admin will see this delivery address in the order details.</p>
                  )}
                </div>
                {error && <div className="mt-4 flex items-center gap-2 bg-red-50 text-red-600 border border-red-100 rounded-xl p-3 text-sm"><AlertCircle size={15} />{error}</div>}
                <button
                  onClick={() => setStep(1)}
                  className="mt-5 w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors active:scale-95"
                >
                  Continue to Payment
                  <ChevronRight size={16} />
                </button>
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
                {error && <div className="mt-4 flex items-center gap-2 bg-red-50 text-red-600 border border-red-100 rounded-xl p-3 text-sm"><AlertCircle size={15} />{error}</div>}
                <div className="flex gap-3 mt-5">
                  <button onClick={() => setStep(0)} className="flex-1 border border-gray-200 text-gray-700 font-semibold py-3 rounded-xl hover:border-gray-300 transition-colors">
                    Back
                  </button>
                  <button onClick={placeOrder} disabled={placing} className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold py-3 rounded-xl transition-colors active:scale-95 flex items-center justify-center gap-2">
                    {placing && <Loader2 size={15} className="animate-spin" />} Place Order
                  </button>
                </div>
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
              <h3 className="font-bold text-gray-900 mb-1">Order Summary</h3>
              <p className="text-xs text-gray-500 mb-4">Only selected cart products will be ordered. Unselected products will stay in your cart.</p>
              <div className="space-y-3 mb-4">
                {checkoutItems.map(({ product, quantity }) => (
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
              <div className="border-t border-gray-100 pt-3 mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <Tag size={15} className="text-orange-500" />
                  <h4 className="text-sm font-bold text-gray-900">Promo Code</h4>
                </div>
                {promoInfo ? (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                    <span className="text-green-700 text-sm font-semibold">{promoInfo.code} applied</span>
                    <button onClick={() => { setPromoInfo(null); setPromoCode(''); }} className="text-gray-400 hover:text-red-500"><Trash2 size={14}/></button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input value={promoCode} onChange={(e) => setPromoCode(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === 'Enter' && applyPromo()} placeholder="Enter promo" className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
                    <button onClick={applyPromo} disabled={promoLoading} className="bg-orange-500 disabled:bg-orange-300 text-white text-sm font-bold px-3 rounded-xl">{promoLoading ? '...' : 'Apply'}</button>
                  </div>
                )}
              </div>
              <div className="border-t border-gray-100 pt-3 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>৳{checkoutTotalPrice.toLocaleString()}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Promo discount ({promoInfo?.code})</span>
                    <span>-৳{discount.toLocaleString()}</span>
                  </div>
                )}
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
