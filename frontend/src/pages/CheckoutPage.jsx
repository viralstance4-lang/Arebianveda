import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle, CreditCard, Truck, Lock } from 'lucide-react'
import useCartStore from '../store/cartStore'
import useAuthStore from '../store/authStore'
import api from '../api'
import toast from 'react-hot-toast'

const STEPS = ['Address', 'Payment']

const STATES = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh','Chandigarh','Puducherry']

export default function CheckoutPage() {
  const { items, coupon, clearCart } = useCartStore()
  const user                         = useAuthStore(s => s.user)
  const navigate                     = useNavigate()

  const [step, setStep]     = useState(0)
  const [loading, setLoading] = useState(false)
  const [payMethod, setPayMethod] = useState('razorpay')
  const [paySettings, setPaySettings] = useState(null)
  const [shipSettings, setShipSettings] = useState({ prepaidFreeThreshold: 499, prepaidCharge: 79, codEnabled: true, codThreshold: 499, codChargeBelow: 79, codChargeAbove: 20 })
  const [address, setAddress] = useState({
    name: user?.name || '', phone: user?.phone || '', email: user?.email || '',
    line1: '', line2: '', city: '', state: '', pincode: '',
  })

  useEffect(() => {
    api.get('/payment-settings')
      .then(({ data }) => setPaySettings(data.settings))
      .catch(() => setPaySettings({ codEnabled: true, onlineEnabled: true, partialCodEnabled: false, advancePercentage: 20, codPercentage: 80 }))
    api.get('/settings/shipping')
      .then(({ data }) => data.settings && setShipSettings(data.settings))
      .catch(() => {})
    if (window.fbq) window.fbq('track', 'InitiateCheckout')
  }, [])

  const paymentOptions = paySettings ? [
    paySettings.onlineEnabled && { value: 'razorpay', label: 'Pay Online', sub: 'UPI, Cards, Net Banking, Wallets via Razorpay', icon: '🔐' },
    paySettings.codEnabled && { value: 'cod', label: 'Cash on Delivery', sub: `Pay when your order arrives (+₹${shipSettings.codChargeBelow} COD charge)`, icon: '💵' },
    paySettings.partialCodEnabled && { value: 'partial_cod', label: 'Partial COD (Advance + COD)', sub: `Pay ${paySettings.advancePercentage}% online now, ${paySettings.codPercentage}% on delivery`, icon: '🪙' },
  ].filter(Boolean) : []

  // Default to the first available method once settings load, in case the
  // initial guess ('razorpay') is disabled for this store.
  useEffect(() => {
    if (paymentOptions.length && !paymentOptions.some(o => o.value === payMethod)) {
      setPayMethod(paymentOptions[0].value)
    }
  }, [paySettings])

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0)
  const discount = coupon
    ? coupon.discountType === 'percentage'
      ? Math.min(Math.round(subtotal * coupon.discountValue / 100), coupon.maxDiscountAmount || Infinity)
      : coupon.discountValue
    : 0
  const shipping = (payMethod === 'cod' || payMethod === 'partial_cod')
    ? (subtotal >= shipSettings.codThreshold ? shipSettings.codChargeAbove : shipSettings.codChargeBelow)
    : (subtotal >= shipSettings.prepaidFreeThreshold ? 0 : shipSettings.prepaidCharge)
  const total    = subtotal - discount + shipping

  const advancePercentage = paySettings?.advancePercentage ?? 20
  const codPercentage     = paySettings?.codPercentage ?? 80
  const advanceAmount     = Math.round(total * advancePercentage / 100)
  const codAmount         = total - advanceAmount

  const setAddr = key => e => setAddress(a => ({ ...a, [key]: e.target.value }))

  const validateAddress = () => {
    const required = ['name', 'phone', 'email', 'line1', 'city', 'state', 'pincode']
    for (const f of required) {
      if (!address[f].trim()) { toast.error(`Please fill in your ${f === 'line1' ? 'address' : f}`); return false }
    }
    if (!/^[6-9]\d{9}$/.test(address.phone)) { toast.error('Enter a valid 10-digit phone number'); return false }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address.email)) { toast.error('Enter a valid email address'); return false }
    if (!/^\d{6}$/.test(address.pincode)) { toast.error('Enter a valid 6-digit pincode'); return false }
    return true
  }

  const placeOrder = async () => {
    setLoading(true)
    try {
      const orderPayload = {
        items: items.map(i => ({ product: i.product._id, quantity: i.qty, price: i.price, name: i.product.name, image: i.product.images?.[0]?.url, variant: i.variant?.label, packageLabel: i.pkg?.label, packageQuantity: i.pkg?.quantity, packagePrice: i.pkg?.price })),
        shippingAddress: address,
        subtotal, shippingCharge: shipping, discount, total,
        paymentMethod: payMethod,
        couponCode: coupon?.code,
        ...(!user && { guestInfo: { name: address.name, phone: address.phone, email: address.email } }),
      }

      if (payMethod === 'cod') {
        const { data } = await api.post('/orders', orderPayload)
        clearCart()
        if (window.fbq) window.fbq('track', 'Purchase', { value: data.order.total, currency: 'INR' })
        navigate('/thank-you', {
          state: {
            orderId:   data.order.orderId,
            total:     data.order.total,
            createdAt: data.order.createdAt,
            emailSent: data.emailSent,
          },
          replace: true,
        })
        return
      }

      // Razorpay flow (also covers Partial COD's advance payment) — the order
      // stays pending/partially_paid until the online payment is verified.
      const { data } = await api.post('/orders', orderPayload)
      const order = data.order

      const { data: rzpOrder } = await api.post('/payments/razorpay/create', { orderId: order._id })

      const isPartial = payMethod === 'partial_cod'
      const options = {
        key: rzpOrder.key,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        name: 'Arebianveda',
        description: isPartial
          ? `Advance payment (${order.advancePercentage}%) — ₹${order.remainingCodAmount} due on delivery`
          : 'Premium Ayurvedic Products',
        image: '/logo.png',
        order_id: rzpOrder.razorpayOrderId,
        handler: async ({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) => {
          const { data: verifyData } = await api.post('/payments/razorpay/verify', { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId: order._id })
          clearCart()
          if (window.fbq) window.fbq('track', 'Purchase', { value: order.total, currency: 'INR' })
          navigate('/thank-you', {
            state: {
              orderId:   order.orderId,
              total:     order.total,
              createdAt: order.createdAt,
              emailSent: verifyData.emailSent,
            },
            replace: true,
          })
        },
        prefill: { name: address.name, contact: address.phone, email: address.email || user?.email || '' },
        theme: { color: '#0F3D22' },
      }
      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', () => toast.error('Payment failed. Please try again.'))
      rzp.open()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-2xl font-serif text-forest-900">Your cart is empty</p>
      <Link to="/shop" className="btn-gold">Shop Now</Link>
    </div>
  )

  const payNowAmount = payMethod === 'partial_cod' ? advanceAmount : total

  return (
    <div className="min-h-screen bg-forest-50/30">
      <div className="bg-forest-900 py-8 px-4 text-center">
        <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "'Playfair Display',serif" }}>Checkout</h1>
      </div>

      {/* Steps indicator */}
      <div className="max-w-2xl mx-auto px-4 pt-8">
        <div className="flex items-center justify-center gap-0 mb-10">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`flex flex-col items-center ${i <= step ? 'text-forest-800' : 'text-forest-300'}`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all ${i < step ? 'bg-forest-800 border-forest-800 text-white' : i === step ? 'border-forest-800 bg-forest-50 text-forest-800' : 'border-forest-200 bg-white text-forest-300'}`}>
                  {i < step ? <CheckCircle size={18} /> : i + 1}
                </div>
                <span className="text-xs mt-1 font-medium">{s}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`w-16 sm:w-24 h-0.5 mx-2 mb-4 ${i < step ? 'bg-forest-800' : 'bg-forest-200'}`} />}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pb-16">
        <div className="grid lg:grid-cols-3 gap-8">

          {/* Main form */}
          <div className="lg:col-span-2">

            {/* Step 0 — Address */}
            {step === 0 && (
              <div className="card p-6">
                <h2 className="font-serif text-xl font-bold text-forest-900 mb-6 flex items-center gap-2">
                  <Truck size={20} className="text-forest-800" /> Delivery Address
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-forest-700 text-sm font-medium mb-2">Full Name *</label>
                    <input className="input" placeholder="Full Name" value={address.name} onChange={setAddr('name')} />
                  </div>
                  <div>
                    <label className="block text-forest-700 text-sm font-medium mb-2">Phone *</label>
                    <input className="input" placeholder="10-digit mobile" value={address.phone} onChange={setAddr('phone')} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-forest-700 text-sm font-medium mb-2">Email Address *</label>
                    <input className="input" type="email" placeholder="you@example.com" value={address.email} onChange={setAddr('email')} />
                    <p className="text-xs text-forest-400 mt-1">Your order invoice will be sent to this email.</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-forest-700 text-sm font-medium mb-2">Address Line 1 *</label>
                    <input className="input" placeholder="House No, Street, Area" value={address.line1} onChange={setAddr('line1')} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-forest-700 text-sm font-medium mb-2">Address Line 2</label>
                    <input className="input" placeholder="Landmark, Near..." value={address.line2} onChange={setAddr('line2')} />
                  </div>
                  <div>
                    <label className="block text-forest-700 text-sm font-medium mb-2">City *</label>
                    <input className="input" placeholder="City" value={address.city} onChange={setAddr('city')} />
                  </div>
                  <div>
                    <label className="block text-forest-700 text-sm font-medium mb-2">Pincode *</label>
                    <input className="input" placeholder="6-digit pincode" maxLength={6} value={address.pincode} onChange={setAddr('pincode')} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-forest-700 text-sm font-medium mb-2">State *</label>
                    <select className="input" value={address.state} onChange={setAddr('state')}>
                      <option value="">Select State</option>
                      {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <button onClick={() => { if (validateAddress()) { setStep(1); window.scrollTo(0, 0); if (window.fbq) window.fbq('track', 'AddPaymentInfo') } }}
                  className="btn-gold mt-6 w-full justify-center py-4 text-base">
                  Continue to Payment →
                </button>
              </div>
            )}

            {/* Step 1 — Payment */}
            {step === 1 && (
              <div className="space-y-4">
                {/* Delivery address summary */}
                <div className="card p-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-forest-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Truck size={12} /> Delivering to</p>
                    <p className="text-sm font-medium text-forest-900">{address.name} · {address.phone}</p>
                    <p className="text-xs text-forest-500 mt-0.5">{address.line1}{address.line2 ? ', ' + address.line2 : ''}, {address.city}, {address.state} — {address.pincode}</p>
                  </div>
                  <button onClick={() => setStep(0)} className="text-forest-800 text-xs font-semibold hover:underline whitespace-nowrap flex-shrink-0">Change</button>
                </div>

              <div className="card p-6">
                <h2 className="font-serif text-xl font-bold text-forest-900 mb-6 flex items-center gap-2">
                  <CreditCard size={20} className="text-forest-800" /> Payment Method
                </h2>
                {!paySettings ? (
                  <p className="text-forest-500 text-sm mb-6">Loading payment methods…</p>
                ) : (
                  <div className="space-y-3 mb-6">
                    {paymentOptions.map(opt => (
                      <label key={opt.value} className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${payMethod === opt.value ? 'border-forest-800 bg-forest-50' : 'border-forest-200 bg-white hover:border-forest-300'}`}>
                        <input type="radio" name="payMethod" value={opt.value} checked={payMethod === opt.value}
                          onChange={() => setPayMethod(opt.value)} className="accent-forest-800" />
                        <span className="text-2xl">{opt.icon}</span>
                        <div>
                          <p className="font-semibold text-forest-900 text-sm">{opt.label}</p>
                          <p className="text-forest-400 text-xs">{opt.sub}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                {payMethod === 'partial_cod' && (
                  <div className="bg-forest-50 border border-forest-200 rounded-xl p-4 space-y-2 mb-5">
                    <p className="text-xs font-semibold text-forest-600 uppercase tracking-wider mb-1">Payment Breakdown</p>
                    <div className="flex justify-between text-sm"><span className="text-forest-600">Order Total</span><span className="font-medium text-forest-900">₹{total}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-forest-600">Advance Payment ({advancePercentage}%)</span><span className="font-semibold text-forest-900">₹{advanceAmount}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-forest-600">Pay on Delivery ({codPercentage}%)</span><span className="font-semibold text-forest-900">₹{codAmount}</span></div>
                  </div>
                )}

                <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-3 mb-5">
                  <Lock size={16} className="text-green-600 flex-shrink-0" />
                  <p className="text-green-700 text-xs">Your payment is 100% secure and encrypted. We never store card details.</p>
                </div>
                <button onClick={placeOrder} disabled={loading || !paySettings} className="btn-gold w-full justify-center py-4 text-base">
                  {loading ? 'Processing...' : payMethod === 'partial_cod' ? `Pay ₹${payNowAmount} Now` : `Place Order — ₹${payNowAmount}`}
                </button>
              </div>
              </div>
            )}
          </div>

          {/* Order summary sidebar */}
          <div className="lg:col-span-1">
            <div className="card p-5 sticky top-24">
              <h3 className="font-serif font-bold text-forest-900 mb-4">Order Summary</h3>
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between"><span className="text-forest-600">Subtotal</span><span className="font-medium text-forest-900">₹{subtotal}</span></div>
                {discount > 0 && <div className="flex justify-between"><span className="text-green-600">Discount</span><span className="text-green-600 font-medium">-₹{discount}</span></div>}
                <div className="flex justify-between"><span className="text-forest-600">Shipping</span><span className={shipping === 0 ? 'text-green-600 font-medium' : 'font-medium text-forest-900'}>{shipping === 0 ? 'FREE' : `₹${shipping}`}</span></div>
                <div className="border-t border-forest-100 pt-2 flex justify-between font-bold text-base">
                  <span className="text-forest-900">Total</span>
                  <span className="text-forest-900">₹{total}</span>
                </div>
                {payMethod === 'partial_cod' && (
                  <div className="border-t border-forest-100 pt-2 space-y-1">
                    <div className="flex justify-between"><span className="text-forest-600">Pay Now ({advancePercentage}%)</span><span className="font-semibold text-forest-900">₹{advanceAmount}</span></div>
                    <div className="flex justify-between"><span className="text-forest-600">Due on Delivery ({codPercentage}%)</span><span className="font-semibold text-forest-900">₹{codAmount}</span></div>
                  </div>
                )}
              </div>
              {items.map(item => (
                <div key={item.key} className="flex gap-2 py-2 border-t border-forest-50 text-xs">
                  <img src={item.product.images?.[0]?.url || '/logo.png'} onError={e => { e.target.onerror = null; e.target.src = '/logo.png' }} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-forest-800 font-medium truncate">{item.product.name}</p>
                    <p className="text-forest-400">{[item.variant?.label, item.pkg?.label].filter(Boolean).join(' / ')} × {item.qty}</p>
                  </div>
                  <p className="text-forest-800 font-semibold">₹{item.price * item.qty}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
