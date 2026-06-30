import React from 'react';
import { Link } from 'react-router-dom';
import { X, Trash2, Plus, Minus, ShoppingBag, ChevronRight } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function CartDrawer() {
  const { state, removeItem, updateQuantity, closeCart, totalPrice, totalItems } = useCart();

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-50 transition-opacity duration-300 ${
          state.isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeCart}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ${
          state.isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ShoppingBag size={20} className="text-orange-500" />
            <h2 className="text-lg font-bold text-gray-900">My Cart</h2>
            {totalItems > 0 && (
              <span className="bg-orange-100 text-orange-600 text-xs font-bold px-2 py-0.5 rounded-full">
                {totalItems} items
              </span>
            )}
          </div>
          <button onClick={closeCart} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors" aria-label="Close cart">
            <X size={18} className="text-gray-600" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {state.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-4">
                <ShoppingBag size={32} className="text-orange-300" />
              </div>
              <p className="text-gray-700 font-semibold text-lg mb-1">Your cart is empty</p>
              <p className="text-gray-400 text-sm mb-6">Add items to get started</p>
              <button onClick={closeCart} className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors">
                Continue Shopping
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {state.items.map(({ product, quantity }) => (
                <div key={product.id} className="flex gap-3 bg-gray-50 rounded-2xl p-3">
                  <Link to={`/product/${product.id}`} onClick={closeCart} className="w-16 h-16 rounded-xl overflow-hidden bg-white flex-shrink-0 border border-gray-100">
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to={`/product/${product.id}`} onClick={closeCart} className="text-sm text-gray-800 font-medium line-clamp-2 leading-snug hover:text-orange-500 transition-colors block mb-1">
                      {product.name}
                    </Link>
                    <p className="text-orange-500 font-bold text-sm">৳{product.price.toLocaleString()}</p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200">
                        <button onClick={() => updateQuantity(product.id, quantity - 1)} className="w-7 h-7 flex items-center justify-center text-gray-600 hover:text-orange-500 transition-colors">
                          <Minus size={13} />
                        </button>
                        <span className="w-7 text-center text-sm font-semibold text-gray-800">{quantity}</span>
                        <button onClick={() => updateQuantity(product.id, quantity + 1)} className="w-7 h-7 flex items-center justify-center text-gray-600 hover:text-orange-500 transition-colors">
                          <Plus size={13} />
                        </button>
                      </div>
                      <button onClick={() => removeItem(product.id)} className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors" aria-label="Remove item">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {state.items.length > 0 && (
          <div className="border-t border-gray-100 px-5 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 font-medium">Subtotal</span>
              <span className="text-xl font-bold text-gray-900">৳{totalPrice.toLocaleString()}</span>
            </div>
            <p className="text-xs text-gray-400">Shipping and taxes calculated at checkout</p>
            <Link
              to="/checkout"
              onClick={closeCart}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 active:scale-95"
            >
              Proceed to Checkout
              <ChevronRight size={15} />
            </Link>
            <Link
              to="/cart"
              onClick={closeCart}
              className="w-full border border-gray-200 hover:border-orange-300 text-gray-700 hover:text-orange-500 font-medium py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
            >
              <ShoppingBag size={15} />
              View Full Cart
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
