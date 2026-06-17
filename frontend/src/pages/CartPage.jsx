import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Minus, Plus, Trash2, Tag, ShoppingBag, ArrowRight, X } from 'lucide-react'
import useCartStore from '../store/cartStore'
import toast from 'react-hot-toast'

export default function CartPage() {
  const { items, removeItem, updateQty, changePackage, coupon, setCoupon } = useCartStore()
  const [couponCode, setCouponCode] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)

  const subtotal  = items.reduce((s, i) => s + i.price * i.qty, 0)
  const discount  = coupon
    ? coupon.discountType === 'percentage'
      ? Math.min(Math.round(subtotal * coupon.discountValue / 100), coupon.maxDiscountAmount || Infinity)
      : coupon.discountValue
    : 0
  const shipping  = subtotal >= 599 ? 0 : 99
  const total     = subtotal - discount + shipping

  const applyCoupon = async () => {
    if (!couponCode.trim()) return
    setCouponLoading(true)
    // Mock coupon check — replace with API call later
    await new Promise(r => setTimeout(r, 800))
    if (couponCode.toUpperCase() === 'WELCOME10') {
      setCoupon({ code: 'WELCOME10', discountType: 'percentage', discountValue: 10, maxDiscountAmount: 200 })
      toast.success('Coupon applied! 10% discount')
    } else if (couponCode.toUpperCase() === 'FLAT100') {
      setCoupon({ code: 'FLAT100', discountType: 'fixed', discountValue: 100 })
      toast.success('Coupon applied! ₹100 off')
    } else {
      toast.error('Invalid coupon code')
    }
    setCouponLoading(false)
  }

  if (items.length === 0) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4">
      <div className="text-8xl">🛒</div>
      <h2 className="text-2xl font-serif font-bold text-forest-900">Your cart is empty</h2>
      <p className="text-forest-500 text-center max-w-sm">Explore our premium Ayurvedic products and add something to your cart</p>
      <Link to="/shop" className="btn-gold px-8 py-4 text-base">
        <ShoppingBag size={20} /> Browse Products
      </Link>
    </div>
  )

  return (
    <div className="min-h-screen bg-forest-50/30">
      <div className="bg-forest-900 py-10 px-4 text-center">
        <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "'Playfair Display',serif" }}>Your Cart</h1>
        <p className="text-forest-300 text-sm mt-1">{items.length} item{items.length > 1 ? 's' : ''}</p>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid lg:grid-cols-3 gap-8">

          {/* Cart items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map(item => (
              <div key={item.key} className="card p-4 flex gap-4">
                <Link to={`/shop/${item.product.slug}`}>
                  <img src={item.product.images?.[0]?.url} alt={item.product.name}
                    className="w-24 h-24 rounded-xl object-cover flex-shrink-0 border border-forest-100" />
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between gap-2">
                    <div>
                      <Link to={`/shop/${item.product.slug}`} className="font-semibold text-forest-900 text-sm hover:text-forest-800 line-clamp-2">
                        {item.product.name}
                      </Link>
                      {item.variant && <p className="text-xs text-forest-400 mt-0.5">{item.variant.label}</p>}
                      {item.pkg && <p className="text-xs text-forest-400 mt-0.5">{item.pkg.label}</p>}
                    </div>
                    <button onClick={() => { removeItem(item.key); toast.success('Removed from cart') }}
                      className="text-forest-300 hover:text-red-400 flex-shrink-0 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {item.product.packageVariants?.length > 1 && (
                    <select value={item.pkg?.label || ''}
                      onChange={e => changePackage(item.key, item.product.packageVariants.find(pv => pv.label === e.target.value))}
                      className="input text-xs py-1.5 mt-2 w-auto">
                      {item.product.packageVariants.map(pv => (
                        <option key={pv.label} value={pv.label}>{pv.label} — ₹{pv.price}</option>
                      ))}
                    </select>
                  )}

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center border border-forest-200 rounded-full bg-white">
                      <button onClick={() => updateQty(item.key, item.qty - 1)} className="px-3 py-1.5 text-forest-600 hover:text-forest-800">
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold text-forest-900">{item.qty}</span>
                      <button onClick={() => updateQty(item.key, item.qty + 1)} className="px-3 py-1.5 text-forest-600 hover:text-forest-800">
                        <Plus size={14} />
                      </button>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-forest-900">₹{item.price * item.qty}</p>
                      {item.comparePrice && <p className="text-xs text-forest-300 line-through">₹{item.comparePrice * item.qty}</p>}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Continue shopping */}
            <Link to="/shop" className="flex items-center gap-2 text-forest-800 hover:text-forest-900 font-medium text-sm mt-2">
              ← Continue Shopping
            </Link>
          </div>

          {/* Order summary */}
          <div className="lg:col-span-1">
            <div className="card p-6 sticky top-24">
              <h3 className="font-serif text-xl font-bold text-forest-900 mb-5">Order Summary</h3>

              <div className="space-y-3 mb-5">
                <div className="flex justify-between text-sm">
                  <span className="text-forest-600">Subtotal ({items.reduce((s, i) => s + i.qty, 0)} items)</span>
                  <span className="text-forest-900 font-medium">₹{subtotal}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600 flex items-center gap-1"><Tag size={13} /> {coupon.code}</span>
                    <span className="text-green-600 font-medium">-₹{discount}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-forest-600">Shipping</span>
                  <span className={shipping === 0 ? 'text-green-600 font-medium' : 'text-forest-900 font-medium'}>
                    {shipping === 0 ? 'FREE' : `₹${shipping}`}
                  </span>
                </div>
                {shipping > 0 && (
                  <p className="text-xs text-forest-400 bg-forest-50 rounded-lg px-3 py-2">
                    Add ₹{599 - subtotal} more for free delivery
                  </p>
                )}
                <div className="border-t border-forest-100 pt-3 flex justify-between font-bold text-lg">
                  <span className="text-forest-900">Total</span>
                  <span className="text-forest-900">₹{total}</span>
                </div>
              </div>

              {/* Coupon */}
              {!coupon ? (
                <div className="mb-5">
                  <p className="text-forest-700 font-semibold text-sm mb-2 flex items-center gap-2"><Tag size={14} /> Have a coupon?</p>
                  <div className="flex gap-2">
                    <input value={couponCode} onChange={e => setCouponCode(e.target.value)}
                      placeholder="Enter code" className="input text-sm py-2 flex-1"
                      onKeyDown={e => e.key === 'Enter' && applyCoupon()} />
                    <button onClick={applyCoupon} disabled={couponLoading}
                      className="btn-gold text-sm px-4 py-2">
                      {couponLoading ? '...' : 'Apply'}
                    </button>
                  </div>
                  <p className="text-xs text-forest-400 mt-1">Try: WELCOME10 or FLAT100</p>
                </div>
              ) : (
                <div className="mb-5 bg-green-50 border border-green-200 rounded-xl p-3 flex justify-between items-center">
                  <div>
                    <p className="text-green-700 font-semibold text-sm">{coupon.code} applied!</p>
                    <p className="text-green-500 text-xs">You saved ₹{discount}</p>
                  </div>
                  <button onClick={() => setCoupon(null)} className="text-green-400 hover:text-red-400">
                    <X size={16} />
                  </button>
                </div>
              )}

              <Link to="/checkout" className="btn-gold w-full justify-center py-4 text-base">
                Proceed to Checkout <ArrowRight size={18} />
              </Link>

              {/* Payment icons */}
              <div className="mt-4 text-center">
                <p className="text-xs text-forest-400 mb-2">Secure payment via</p>
                <div className="flex justify-center gap-2 flex-wrap">
                  {['UPI', 'Razorpay', 'COD', 'Cards'].map(p => (
                    <span key={p} className="bg-forest-50 border border-forest-100 text-forest-400 text-xs px-2 py-1 rounded">{p}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
