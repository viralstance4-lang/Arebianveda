import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { CheckCircle, ShoppingBag, Mail, MailX } from 'lucide-react'

const REDIRECT_SECONDS = 60

export default function ThankYouPage() {
  const { state }           = useLocation()
  const navigate            = useNavigate()
  const [countdown, setCountdown] = useState(REDIRECT_SECONDS)

  // Guard: no order in state → send to shop
  useEffect(() => {
    if (!state?.orderId) navigate('/shop', { replace: true })
  }, [])

  // Countdown → auto-redirect
  useEffect(() => {
    if (!state?.orderId) return
    if (countdown <= 0) { navigate('/shop', { replace: true }); return }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown, state])

  if (!state?.orderId) return null

  const { orderId, total, createdAt, emailSent } = state

  const orderDate = createdAt
    ? new Date(createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="min-h-screen bg-forest-50/30 flex flex-col">

      {/* Header */}
      <div className="bg-forest-900 py-8 px-4 text-center">
        <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "'Playfair Display',serif" }}>
          Order Confirmed
        </h1>
      </div>

      <div className="flex-1 flex items-start justify-center px-4 py-12">
        <div className="w-full max-w-lg space-y-4">

          {/* Main success card */}
          <div className="card p-8 text-center">

            {/* Animated check icon */}
            <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ring-green-50">
              <CheckCircle size={48} strokeWidth={1.5} className="text-green-500" />
            </div>

            <h2 className="text-2xl font-bold text-forest-900 mb-2" style={{ fontFamily: "'Playfair Display',serif" }}>
              Thank You for Your Order!
            </h2>
            <p className="text-forest-600 text-base mb-4">
              Your order has been placed successfully.
            </p>

            {/* Email status */}
            {emailSent === true && (
              <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-2 mb-2">
                <Mail size={15} className="flex-shrink-0" />
                A copy of your invoice has been sent to your email address.
              </div>
            )}
            {emailSent === false && (
              <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-xl px-4 py-2 mb-2">
                <MailX size={15} className="flex-shrink-0" />
                We were unable to send the invoice email, but your order is confirmed.
              </div>
            )}
            {emailSent !== true && emailSent !== false && (
              <div className="inline-flex items-center gap-2 bg-forest-50 border border-forest-200 text-forest-600 text-sm rounded-xl px-4 py-2 mb-2">
                <Mail size={15} className="flex-shrink-0" />
                Your order has been confirmed. An invoice will be sent to your email.
              </div>
            )}
          </div>

          {/* Order details card */}
          <div className="card p-6">
            <h3 className="text-xs font-semibold text-forest-500 uppercase tracking-wider mb-4">Order Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-forest-500">Order ID</span>
                <span className="font-bold text-forest-900 font-mono text-base tracking-wide">#{orderId}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-forest-500">Order Date</span>
                <span className="font-medium text-forest-900">{orderDate}</span>
              </div>
              {total != null && (
                <div className="flex justify-between items-center text-sm pt-3 border-t border-forest-100">
                  <span className="text-forest-600 font-medium">Total Amount</span>
                  <span className="font-bold text-forest-900 text-lg">₹{total.toLocaleString('en-IN')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Link to="/shop" className="btn-gold w-full justify-center py-3.5 text-base flex items-center gap-2">
              <ShoppingBag size={18} /> Continue Shopping
            </Link>
          </div>

          {/* Countdown */}
          <p className="text-center text-xs text-forest-400 pb-4">
            You will be redirected to the shop automatically in{' '}
            <span className="font-semibold text-forest-700">{countdown}</span> second{countdown !== 1 ? 's' : ''}.
          </p>

        </div>
      </div>
    </div>
  )
}
