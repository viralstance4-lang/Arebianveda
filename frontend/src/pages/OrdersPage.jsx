import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Package, CheckCircle, Truck, Clock, XCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api'
import useAuthStore from '../store/authStore'
import { SHIPPING_STATUS_COLORS, SHIPPING_STATUS_LABELS } from '../utils/format'

const STATUS_CONFIG = {
  placed:     { label: 'Order Placed',  color: 'bg-blue-100 text-blue-700',    icon: <Clock size={14} /> },
  confirmed:  { label: 'Confirmed',     color: 'bg-forest-100 text-forest-900', icon: <CheckCircle size={14} /> },
  processing: { label: 'Processing',    color: 'bg-orange-100 text-orange-700', icon: <Package size={14} /> },
  shipped:    { label: 'Shipped',       color: 'bg-purple-100 text-purple-700', icon: <Truck size={14} /> },
  delivered:  { label: 'Delivered',     color: 'bg-green-100 text-green-700',   icon: <CheckCircle size={14} /> },
  cancelled:  { label: 'Cancelled',     color: 'bg-red-100 text-red-700',       icon: <XCircle size={14} /> },
}

export default function OrdersPage() {
  const user              = useAuthStore(s => s.user)
  const [searchParams]    = useSearchParams()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [retryingId, setRetryingId] = useState(null)
  const successId         = searchParams.get('success')

  useEffect(() => {
    if (!user) return
    api.get('/orders/my').then(({ data }) => setOrders(data.orders || [])).finally(() => setLoading(false))
  }, [user])

  const retryPayment = async (order) => {
    setRetryingId(order._id)
    try {
      const { data: rzpOrder } = await api.post('/payments/razorpay/create', { orderId: order._id })
      const isPartial = order.paymentMethod === 'partial_cod'
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
          try {
            await api.post('/payments/razorpay/verify', { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId: order._id })
            toast.success(isPartial ? 'Advance payment successful!' : 'Payment successful!')
            const { data } = await api.get('/orders/my')
            setOrders(data.orders || [])
          } catch (err) {
            toast.error(err.response?.data?.message || 'Payment verification failed')
          }
        },
        prefill: {
          name: order.shippingAddress?.name,
          contact: order.shippingAddress?.phone,
          email: user?.email || order.guestInfo?.email || '',
        },
        theme: { color: '#0F3D22' },
      }
      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', () => toast.error('Payment failed. Please try again.'))
      rzp.open()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not start payment')
    } finally {
      setRetryingId(null)
    }
  }

  if (!user) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-xl font-serif text-forest-900">Please login to view your orders</p>
      <Link to="/login" className="btn-gold">Sign In</Link>
    </div>
  )

  return (
    <div className="min-h-screen bg-forest-50/30">
      <div className="bg-forest-900 py-10 px-4 text-center">
        <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "'Playfair Display',serif" }}>My Orders</h1>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Success banner */}
        {successId && (
          <div className="bg-green-50 border border-green-300 rounded-2xl p-5 mb-8 flex items-start gap-4">
            <CheckCircle size={24} className="text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-green-800">Order Placed Successfully!</h3>
              <p className="text-green-600 text-sm mt-1">Order ID: <span className="font-mono font-bold">{successId}</span></p>
              <p className="text-green-500 text-sm">You will receive a confirmation email shortly. Estimated delivery: 3–5 business days.</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-16">
            <div className="w-10 h-10 border-4 border-forest-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-forest-500">Loading your orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="card p-10 text-center">
            <Package size={56} className="text-forest-200 mx-auto mb-4" />
            <h3 className="font-serif text-xl font-bold text-forest-900 mb-2">No Orders Yet</h3>
            <p className="text-forest-500 text-sm mb-6">Your order history will appear here once you place your first order</p>
            <Link to="/shop" className="btn-gold">Start Shopping</Link>
          </div>
        ) : (
          <div className="space-y-5">
            {orders.map(order => {
              const status = STATUS_CONFIG[order.orderStatus] || STATUS_CONFIG.placed
              return (
                <div key={order._id} className="card p-5">
                  <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
                    <div>
                      <p className="font-mono text-sm font-bold text-forest-900">{order.orderId}</p>
                      <p className="text-xs text-forest-400 mt-0.5">{new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${status.color}`}>
                        {status.icon} {status.label}
                      </span>
                      {order.shippingStatus && order.shippingStatus !== 'not_created' && (
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${SHIPPING_STATUS_COLORS[order.shippingStatus] || 'bg-gray-100 text-gray-700'}`}>
                          {SHIPPING_STATUS_LABELS[order.shippingStatus] || order.shippingStatus}
                        </span>
                      )}
                      <span className="font-bold text-forest-900">₹{order.total}</span>
                    </div>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex gap-3 items-center flex-shrink-0 bg-forest-50 rounded-xl p-3 border border-forest-100">
                        {item.image && <img src={item.image} alt={item.name} className="w-12 h-12 rounded-lg object-cover" />}
                        <div>
                          <p className="text-sm font-medium text-forest-900">{item.name}</p>
                          <p className="text-xs text-forest-400">Qty: {item.quantity} · ₹{item.price}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {order.paymentMethod === 'partial_cod' && (
                    <div className="mt-3 pt-3 border-t border-forest-100 flex flex-wrap gap-4 text-xs">
                      <span className="text-forest-500">
                        Advance Paid ({order.advancePercentage}%): <span className="font-semibold text-forest-900">₹{order.paidOnlineAmount}</span>
                      </span>
                      <span className="text-forest-500">
                        Due on Delivery ({order.codPercentage}%): <span className="font-semibold text-forest-900">₹{order.remainingCodAmount}</span>
                      </span>
                      <span className="text-forest-500">
                        Payment Status: <span className="font-semibold text-forest-900 capitalize">{order.paymentStatus?.replace('_', ' ')}</span>
                      </span>
                    </div>
                  )}
                  {order.paymentMethod !== 'cod' && ['pending', 'failed'].includes(order.paymentStatus) && (
                    <div className="mt-3 pt-3 border-t border-forest-100 flex items-center justify-between gap-3">
                      <p className="text-xs text-red-500">
                        {order.paymentStatus === 'failed' ? 'Payment failed.' : 'Payment incomplete.'} Complete it to confirm your order.
                      </p>
                      <button onClick={() => retryPayment(order)} disabled={retryingId === order._id} className="btn-gold text-xs flex-shrink-0">
                        {retryingId === order._id ? <Loader2 size={14} className="animate-spin" /> : null} Retry Payment
                      </button>
                    </div>
                  )}
                  {(order.awbCode || order.trackingNumber) && (
                    <div className="mt-3 pt-3 border-t border-forest-100">
                      <p className="text-xs text-forest-500">
                        Tracking: <span className="font-mono font-semibold text-forest-700">{order.awbCode || order.trackingNumber}</span>
                        {order.courierName && <span className="ml-2 text-forest-400">via {order.courierName}</span>}
                        {(order.shiprocketTrackingUrl || order.trackingUrl) && (
                          <a href={order.shiprocketTrackingUrl || order.trackingUrl} target="_blank" rel="noreferrer" className="ml-2 text-forest-800 hover:underline">Track</a>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
