import { useEffect, useState } from 'react'
import {
  Search, Download, X, Eye, Trash2, Package, MapPin, User as UserIcon,
  CreditCard, Clock, Loader2, Gift, ChevronLeft, ChevronRight, Truck,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api'
import {
  fmtINR, fmtDate, fmtDateTime,
  ORDER_STATUSES, ORDER_STATUS_COLORS, PAYMENT_STATUS_COLORS, PAYMENT_STATUSES, PAYMENT_METHOD_LABELS,
  SHIPPING_STATUS_COLORS, SHIPPING_STATUS_LABELS, REFUND_STATUS_COLORS,
} from '../../utils/format'

function OrderDrawer({ orderId, onClose, onUpdated, onDeleted }) {
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ orderStatus: '', trackingNumber: '', trackingUrl: '', note: '' })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [paymentStatusForm, setPaymentStatusForm] = useState('')
  const [savingPayment, setSavingPayment] = useState(false)
  const [srAction, setSrAction] = useState(null)
  const [showRefundForm, setShowRefundForm] = useState(false)
  const [refundType, setRefundType] = useState('full')
  const [refundAmount, setRefundAmount] = useState('')
  const [refundNotes, setRefundNotes] = useState('')
  const [issuingRefund, setIssuingRefund] = useState(false)

  useEffect(() => {
    setLoading(true)
    api.get(`/orders/admin/${orderId}`)
      .then(({ data }) => {
        setOrder(data.order)
        setForm({
          orderStatus: data.order.orderStatus,
          trackingNumber: data.order.trackingNumber || '',
          trackingUrl: data.order.trackingUrl || '',
          note: '',
        })
        setPaymentStatusForm(data.order.paymentStatus)
      })
      .catch(() => toast.error('Failed to load order'))
      .finally(() => setLoading(false))
  }, [orderId])

  const handleUpdate = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { data } = await api.put(`/orders/admin/${orderId}/status`, form)
      setOrder(data.order)
      setForm(f => ({ ...f, note: '' }))
      toast.success('Order updated')
      onUpdated?.(data.order)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  const handlePaymentStatusUpdate = async (e) => {
    e.preventDefault()
    setSavingPayment(true)
    try {
      const { data } = await api.patch(`/orders/admin/${orderId}/payment-status`, { paymentStatus: paymentStatusForm })
      setOrder(data.order)
      toast.success('Payment status updated')
      onUpdated?.(data.order)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed')
    } finally {
      setSavingPayment(false)
    }
  }

  const handleIssueRefund = async (e) => {
    e.preventDefault()
    setIssuingRefund(true)
    try {
      const payload = refundType === 'partial' ? { amount: Number(refundAmount) } : {}
      if (refundNotes) payload.notes = refundNotes
      const { data } = await api.post(`/payments/admin/${orderId}/refund`, payload)
      setOrder(data.order)
      toast.success('Refund issued successfully')
      setShowRefundForm(false)
      setRefundType('full')
      setRefundAmount('')
      setRefundNotes('')
      onUpdated?.(data.order)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Refund failed')
    } finally {
      setIssuingRefund(false)
    }
  }

  const runShiprocketAction = async (action, successMessage) => {
    setSrAction(action)
    try {
      const endpoint = `/shipping/admin/${orderId}/${action}`
      const { data } = action === 'track' ? await api.get(endpoint) : await api.post(endpoint)
      setOrder(data.order)
      toast.success(successMessage)
      onUpdated?.(data.order)
    } catch (err) {
      if (err.response?.data?.order) setOrder(err.response.data.order)
      toast.error(err.response?.data?.message || 'Shiprocket action failed')
    } finally {
      setSrAction(null)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Delete order ${order.orderId}? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await api.delete(`/orders/admin/${orderId}`)
      toast.success('Order deleted')
      onDeleted?.(orderId)
      onClose()
    } catch {
      toast.error('Failed to delete order')
    } finally {
      setDeleting(false)
    }
  }

  const customer = order?.user || order?.guestInfo
  const chargeAmount = order ? (order.paymentMethod === 'partial_cod' ? order.paidOnlineAmount : order.total) : 0
  const alreadyRefunded = order ? (order.refunds || []).filter(r => r.status !== 'failed').reduce((s, r) => s + r.amount, 0) : 0
  const maxRefundable = chargeAmount - alreadyRefunded

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside className="relative w-full sm:w-[480px] max-w-full bg-white h-full overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-forest-100 px-5 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="font-bold text-forest-900 font-serif text-lg">{order?.orderId || 'Order'}</h2>
            {order && <p className="text-xs text-forest-400">{fmtDateTime(order.createdAt)}</p>}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-forest-50 text-forest-400">
            <X size={20} />
          </button>
        </div>

        {loading || !order ? (
          <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-forest-800" size={28} /></div>
        ) : (
          <div className="p-5 space-y-5">
            {/* Status badges */}
            <div className="flex flex-wrap gap-2">
              <span className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${ORDER_STATUS_COLORS[order.orderStatus] || 'bg-gray-100 text-gray-700'}`}>
                {order.orderStatus}
              </span>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${PAYMENT_STATUS_COLORS[order.paymentStatus] || 'bg-gray-100 text-gray-700'}`}>
                {order.paymentStatus}
              </span>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-forest-100 text-forest-700">
                {PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod}
              </span>
            </div>

            {/* Customer */}
            <div className="card p-4">
              <h3 className="text-xs font-semibold text-forest-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <UserIcon size={13} /> Customer
              </h3>
              <p className="text-sm font-medium text-forest-900">{customer?.name || 'Guest'}</p>
              <p className="text-xs text-forest-500">{customer?.email}</p>
              {(order.shippingAddress?.phone || customer?.phone) && (
                <p className="text-xs text-forest-500">{order.shippingAddress?.phone || customer?.phone}</p>
              )}
            </div>

            {/* Shipping address */}
            {order.shippingAddress && (
              <div className="card p-4">
                <h3 className="text-xs font-semibold text-forest-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <MapPin size={13} /> Shipping Address
                </h3>
                <p className="text-sm text-forest-900">{order.shippingAddress.name}</p>
                <p className="text-xs text-forest-600 mt-1">
                  {order.shippingAddress.line1}{order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ''}
                </p>
                <p className="text-xs text-forest-600">
                  {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}
                </p>
              </div>
            )}

            {/* Shiprocket */}
            <div className="card p-4">
              <h3 className="text-xs font-semibold text-forest-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Truck size={13} /> Shiprocket
              </h3>
              <div className="space-y-1.5 text-sm mb-3">
                <div className="flex justify-between items-center">
                  <span className="text-forest-500">Status</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SHIPPING_STATUS_COLORS[order.shippingStatus] || 'bg-gray-100 text-gray-700'}`}>
                    {SHIPPING_STATUS_LABELS[order.shippingStatus] || order.shippingStatus}
                  </span>
                </div>
                {order.shiprocketOrderId && (
                  <div className="flex justify-between"><span className="text-forest-500">Shiprocket Order ID</span><span className="font-mono text-forest-900">{order.shiprocketOrderId}</span></div>
                )}
                {order.shipmentId && (
                  <div className="flex justify-between"><span className="text-forest-500">Shipment ID</span><span className="font-mono text-forest-900">{order.shipmentId}</span></div>
                )}
                {order.awbCode && (
                  <div className="flex justify-between"><span className="text-forest-500">AWB</span><span className="font-mono text-forest-900">{order.awbCode}</span></div>
                )}
                {order.courierName && (
                  <div className="flex justify-between"><span className="text-forest-500">Courier</span><span className="text-forest-900">{order.courierName}</span></div>
                )}
              </div>

              {order.shiprocketError && (
                <p className="text-xs text-red-600 bg-red-50 rounded-lg p-2 mb-3">
                  {order.shiprocketErrorCode && <span className="font-mono font-semibold mr-1">[{order.shiprocketErrorCode}]</span>}
                  {order.shiprocketError}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                {order.shippingStatus === 'not_created' && (
                  <button onClick={() => runShiprocketAction('create', order.shiprocketOrderId ? 'Sync retried' : 'Shipment created')} disabled={!!srAction} className="btn-outline-gold text-xs">
                    {srAction === 'create' ? <Loader2 size={14} className="animate-spin" /> : null}
                    {order.shiprocketOrderId ? 'Retry Sync' : 'Create Shipment'}
                  </button>
                )}
                {order.paymentMethod === 'partial_cod' && ['created', 'ready_to_ship'].includes(order.shippingStatus) && (
                  <button onClick={() => runShiprocketAction('re-sync', 'Re-synced with correct COD amount')} disabled={!!srAction} className="btn-outline-gold text-xs">
                    {srAction === 're-sync' ? <Loader2 size={14} className="animate-spin" /> : null}
                    Re-sync COD Amount
                  </button>
                )}
                {order.shippingStatus === 'created' && (
                  <>
                    <button onClick={() => runShiprocketAction('ship-now', 'Shipment is ready')} disabled={!!srAction} className="btn-gold text-xs">
                      {srAction === 'ship-now' ? <Loader2 size={14} className="animate-spin" /> : null} Ship Now
                    </button>
                    <button onClick={() => runShiprocketAction('generate-awb', 'AWB generated')} disabled={!!srAction} className="btn-outline-gold text-xs">
                      {srAction === 'generate-awb' ? <Loader2 size={14} className="animate-spin" /> : null} Generate AWB
                    </button>
                  </>
                )}
                {order.shippingStatus === 'ready_to_ship' && !order.pickupRequested && (
                  <button onClick={() => runShiprocketAction('request-pickup', 'Pickup requested')} disabled={!!srAction} className="btn-gold text-xs">
                    {srAction === 'request-pickup' ? <Loader2 size={14} className="animate-spin" /> : null} Request Pickup
                  </button>
                )}
                {order.awbCode && (
                  <button onClick={() => runShiprocketAction('track', 'Tracking refreshed')} disabled={!!srAction} className="btn-outline-gold text-xs">
                    {srAction === 'track' ? <Loader2 size={14} className="animate-spin" /> : null} Track Shipment
                  </button>
                )}
              </div>

              {order.shiprocketTrackingUrl && (
                <a href={order.shiprocketTrackingUrl} target="_blank" rel="noreferrer" className="text-xs text-forest-800 hover:underline mt-2 inline-block">
                  View tracking page →
                </a>
              )}
            </div>

            {/* Items */}
            <div className="card p-4">
              <h3 className="text-xs font-semibold text-forest-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Package size={13} /> Items ({order.items?.length || 0})
              </h3>
              <div className="space-y-3">
                {order.items?.map((it, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <img src={it.image} alt={it.name} className="w-12 h-12 rounded-lg object-cover bg-forest-100 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-forest-900 truncate flex items-center gap-1.5">
                        {it.name}
                        {it.isFreeGift && (
                          <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 flex-shrink-0">
                            <Gift size={10} /> Free Gift
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-forest-400">Qty: {it.quantity}</p>
                      {it.packageLabel && (
                        <p className="text-xs text-forest-400">{it.packageLabel} (×{it.packageQuantity} units)</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      {it.isFreeGift ? (
                        <p className="text-sm font-semibold text-green-600">FREE</p>
                      ) : (
                        <p className="text-sm font-semibold text-forest-900">{fmtINR(it.price * it.quantity)}</p>
                      )}
                      {it.originalPrice > it.price && !it.isFreeGift && (
                        <p className="text-xs text-forest-300 line-through">{fmtINR(it.originalPrice * it.quantity)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Partial COD — prominent payment breakdown */}
            {order.paymentMethod === 'partial_cod' && (
              <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 space-y-2">
                <p className="text-xs font-bold text-purple-700 uppercase tracking-wider flex items-center gap-1.5">
                  ⚡ Partial COD — Payment Breakdown
                </p>
                <div className="flex justify-between text-sm">
                  <span className="text-forest-600">Total Order Amount</span>
                  <span className="font-bold text-forest-900">{fmtINR(order.total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-green-700 flex items-center gap-1">✓ Advance Paid Online ({order.advancePercentage}%)</span>
                  <span className="font-bold text-green-700">{fmtINR(order.paidOnlineAmount)}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-purple-200">
                  <span className="text-orange-600 font-semibold flex items-center gap-1">⚠ Collect at Door ({order.codPercentage}%)</span>
                  <span className="font-bold text-orange-600 text-base">{fmtINR(order.remainingCodAmount)}</span>
                </div>
                <p className="text-[10px] text-purple-600 pt-1">
                  Shiprocket COD amount set to <strong>{fmtINR(order.remainingCodAmount)}</strong> — delivery partner collects only the remaining balance.
                </p>
              </div>
            )}

            {/* Price breakdown */}
            <div className="card p-4 space-y-1.5 text-sm">
              <h3 className="text-xs font-semibold text-forest-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CreditCard size={13} /> Payment Summary
              </h3>
              <div className="flex justify-between text-forest-600"><span>Subtotal</span><span>{fmtINR(order.subtotal)}</span></div>
              <div className="flex justify-between text-forest-600">
                <span>Shipping</span>
                <span>{order.shippingCharge ? fmtINR(order.shippingCharge) : 'Free'}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount {order.couponCode ? `(${order.couponCode})` : ''}</span>
                  <span>-{fmtINR(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-forest-900 pt-2 border-t border-forest-100 mt-2">
                <span>Total</span><span>{fmtINR(order.total)}</span>
              </div>
              {order.paymentMethod === 'partial_cod' && (
                <>
                  <div className="flex justify-between text-green-700">
                    <span>✓ Advance Paid Online ({order.advancePercentage}%)</span>
                    <span>-{fmtINR(order.paidOnlineAmount)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-orange-700 pt-1.5 border-t border-forest-100">
                    <span>Remaining — Collect at Door</span>
                    <span>{fmtINR(order.remainingCodAmount)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Payment Gateway */}
            {order.razorpayOrderId && (
              <div className="card p-4 space-y-3 text-sm">
                <h3 className="text-xs font-semibold text-forest-500 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard size={13} /> Payment Gateway
                </h3>
                <div className="space-y-1.5">
                  <div className="flex justify-between"><span className="text-forest-500">Gateway</span><span className="font-medium text-forest-900 capitalize">{order.paymentGateway || 'razorpay'}</span></div>
                  <div className="flex justify-between"><span className="text-forest-500">Razorpay Order ID</span><span className="font-mono text-xs text-forest-900">{order.razorpayOrderId}</span></div>
                  {order.razorpayPaymentId && (
                    <div className="flex justify-between"><span className="text-forest-500">Razorpay Payment ID</span><span className="font-mono text-xs text-forest-900">{order.razorpayPaymentId}</span></div>
                  )}
                  {order.paymentCapturedAt && (
                    <div className="flex justify-between"><span className="text-forest-500">Transaction Date</span><span className="text-forest-900">{fmtDateTime(order.paymentCapturedAt)}</span></div>
                  )}
                </div>

                {order.refunds?.length > 0 && (
                  <div className="pt-2 border-t border-forest-100 space-y-1.5">
                    <p className="text-xs font-semibold text-forest-500 uppercase tracking-wider">Refund History</p>
                    {order.refunds.map((r, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <div>
                          <p className="text-forest-900 font-medium">{fmtINR(r.amount)}</p>
                          <p className="text-xs text-forest-400 font-mono">{r.refundId}</p>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${REFUND_STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-700'}`}>{r.status}</span>
                      </div>
                    ))}
                  </div>
                )}

                {order.razorpayPaymentId && maxRefundable > 0 && (
                  <div className="pt-2 border-t border-forest-100">
                    {showRefundForm ? (
                      <form onSubmit={handleIssueRefund} className="space-y-2">
                        <div className="flex gap-4 text-xs">
                          <label className="flex items-center gap-1.5">
                            <input type="radio" checked={refundType === 'full'} onChange={() => setRefundType('full')} className="accent-forest-800" /> Full Refund ({fmtINR(maxRefundable)})
                          </label>
                          <label className="flex items-center gap-1.5">
                            <input type="radio" checked={refundType === 'partial'} onChange={() => setRefundType('partial')} className="accent-forest-800" /> Partial Refund
                          </label>
                        </div>
                        {refundType === 'partial' && (
                          <input type="number" min="1" max={maxRefundable} step="1" value={refundAmount}
                            onChange={e => setRefundAmount(e.target.value)} placeholder={`Amount (max ${fmtINR(maxRefundable)})`}
                            className="input" required />
                        )}
                        <textarea value={refundNotes} onChange={e => setRefundNotes(e.target.value)} className="input resize-none h-16" placeholder="Reason (optional)" />
                        <div className="flex gap-2">
                          <button type="submit" disabled={issuingRefund} className="btn-gold text-sm flex-1 justify-center">
                            {issuingRefund ? <Loader2 size={14} className="animate-spin" /> : null} Confirm Refund
                          </button>
                          <button type="button" onClick={() => setShowRefundForm(false)} className="btn-outline-gold text-sm">Cancel</button>
                        </div>
                      </form>
                    ) : (
                      <button onClick={() => setShowRefundForm(true)} className="btn-outline-gold text-sm w-full justify-center">
                        Issue Refund
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Status timeline */}
            {order.statusHistory?.length > 0 && (
              <div className="card p-4">
                <h3 className="text-xs font-semibold text-forest-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Clock size={13} /> Status Timeline
                </h3>
                <div className="space-y-3">
                  {[...order.statusHistory].reverse().map((h, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-forest-800 mt-1.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-forest-900 capitalize">{h.status}</p>
                        <p className="text-xs text-forest-400">{fmtDateTime(h.timestamp)}</p>
                        {h.note && <p className="text-xs text-forest-500 mt-0.5">{h.note}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Update status */}
            <form onSubmit={handleUpdate} className="card p-4 space-y-3">
              <h3 className="text-xs font-semibold text-forest-500 uppercase tracking-wider">Update Status</h3>
              <div>
                <label className="block text-xs text-forest-500 mb-1.5">Order Status</label>
                <select value={form.orderStatus} onChange={e => setForm(f => ({ ...f, orderStatus: e.target.value }))} className="input capitalize">
                  {ORDER_STATUSES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-forest-500 mb-1.5">Tracking Number</label>
                  <input value={form.trackingNumber} onChange={e => setForm(f => ({ ...f, trackingNumber: e.target.value }))} className="input" placeholder="AWB123456" />
                </div>
                <div>
                  <label className="block text-xs text-forest-500 mb-1.5">Tracking URL</label>
                  <input value={form.trackingUrl} onChange={e => setForm(f => ({ ...f, trackingUrl: e.target.value }))} className="input" placeholder="https://..." />
                </div>
              </div>
              <div>
                <label className="block text-xs text-forest-500 mb-1.5">Note (optional)</label>
                <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} className="input resize-none h-16" placeholder="Internal note for this status change..." />
              </div>
              <button type="submit" disabled={saving} className="btn-gold w-full text-sm justify-center">
                {saving ? <Loader2 size={16} className="animate-spin" /> : null} Save Update
              </button>
            </form>

            {/* Update payment status (manual override) */}
            <form onSubmit={handlePaymentStatusUpdate} className="card p-4 space-y-3">
              <h3 className="text-xs font-semibold text-forest-500 uppercase tracking-wider">Update Payment Status</h3>
              <select value={paymentStatusForm} onChange={e => setPaymentStatusForm(e.target.value)} className="input">
                {PAYMENT_STATUSES.map(s => <option key={s} value={s} className="capitalize">{s.replace('_', ' ')}</option>)}
              </select>
              <button type="submit" disabled={savingPayment} className="btn-outline-gold w-full text-sm justify-center">
                {savingPayment ? <Loader2 size={16} className="animate-spin" /> : null} Update Payment Status
              </button>
            </form>

            {/* Delete */}
            <button onClick={handleDelete} disabled={deleting} className="w-full text-sm text-red-500 hover:text-red-600 font-medium flex items-center justify-center gap-1.5 py-2">
              {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Delete Order
            </button>
          </div>
        )}
      </aside>
    </div>
  )
}

const PAYMENT_METHOD_FILTERS = [
  { label: 'All Orders',   value: '' },
  { label: 'COD',          value: 'cod' },
  { label: 'Partial COD',  value: 'partial_cod' },
  { label: 'Online Paid',  value: 'razorpay' },
]

export default function AdminOrders() {
  const [orders, setOrders] = useState([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)

  const load = () => {
    setLoading(true)
    const params = new URLSearchParams({ page, limit: 20 })
    if (status) params.set('status', status)
    if (search) params.set('search', search)
    if (paymentFilter) params.set('paymentMethod', paymentFilter)
    api.get(`/orders/admin/all?${params}`)
      .then(({ data }) => {
        setOrders(data.orders || [])
        setTotal(data.total || 0)
        setPages(data.pages || 1)
      })
      .catch(() => toast.error('Failed to load orders'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    const t = setTimeout(load, search ? 400 : 0)
    return () => clearTimeout(t)
  }, [page, status, paymentFilter, search])

  useEffect(() => { setPage(1) }, [status, paymentFilter, search])

  const exportCSV = () => {
    const headers = ['Order ID', 'Customer', 'Email', 'Date', 'Items', 'Total', 'Payment', 'Status']
    const rows = orders.map(o => [
      o.orderId,
      o.user?.name || o.guestInfo?.name || 'Guest',
      o.user?.email || o.guestInfo?.email || '',
      fmtDate(o.createdAt),
      o.items?.length || 0,
      o.total,
      `${o.paymentMethod} (${o.paymentStatus})`,
      o.orderStatus,
    ])
    const csv = [headers, ...rows]
      .map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `orders-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleUpdated = (updated) => {
    setOrders(prev => prev.map(o => o._id === updated._id ? { ...o, orderStatus: updated.orderStatus, paymentStatus: updated.paymentStatus } : o))
  }
  const handleDeleted = (id) => {
    setOrders(prev => prev.filter(o => o._id !== id))
    setTotal(t => Math.max(0, t - 1))
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-forest-900 font-serif">Orders</h1>
          <p className="text-sm text-forest-500 mt-0.5">{total} total orders</p>
        </div>
        <button onClick={exportCSV} className="btn-outline-gold text-sm">
          <Download size={16} /> Export CSV
        </button>
      </div>

      {/* Search + Status filter row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-forest-300" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="input pl-9" placeholder="Search order ID, name, phone, email..." />
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)} className="input max-w-[180px] capitalize">
          <option value="">All Statuses</option>
          {ORDER_STATUSES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
        </select>
      </div>

      {/* Payment method filter tabs */}
      <div className="flex flex-wrap gap-2">
        {PAYMENT_METHOD_FILTERS.map(f => (
          <button key={f.value} onClick={() => setPaymentFilter(f.value)}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              paymentFilter === f.value
                ? 'bg-forest-800 text-white'
                : 'bg-white border border-forest-200 text-forest-600 hover:bg-forest-50'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-forest-100">
                {['Order ID', 'Customer', 'Date', 'Items', 'Total', 'Payment', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-forest-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-forest-50">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-forest-100 rounded animate-pulse" style={{ width: `${50 + j * 5}%` }} /></td>
                    ))}
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-forest-400">
                    <Package size={28} className="mx-auto mb-2 opacity-50" />
                    No orders found
                  </td>
                </tr>
              ) : orders.map(o => (
                <tr key={o._id} className="border-b border-forest-50 hover:bg-forest-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-forest-900">{o.orderId}</td>
                  <td className="px-4 py-3">
                    <p className="text-forest-900">{o.user?.name || o.guestInfo?.name || 'Guest'}</p>
                    <p className="text-xs text-forest-400">{o.user?.email || o.guestInfo?.email}</p>
                  </td>
                  <td className="px-4 py-3 text-forest-600 whitespace-nowrap">{fmtDate(o.createdAt)}</td>
                  <td className="px-4 py-3 text-forest-600">{o.items?.length || 0}</td>
                  <td className="px-4 py-3 font-semibold text-forest-900">{fmtINR(o.total)}</td>
                  <td className="px-4 py-3">
                    {o.paymentMethod === 'partial_cod' ? (
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-purple-100 text-purple-700">
                          ⚡ Partial COD
                        </span>
                        <p className="text-[10px] text-forest-500 leading-tight">
                          Adv: <span className="font-semibold text-green-700">{fmtINR(o.paidOnlineAmount)}</span>
                          {' · '}COD: <span className="font-semibold text-orange-700">{fmtINR(o.remainingCodAmount)}</span>
                        </p>
                      </div>
                    ) : o.paymentMethod === 'cod' ? (
                      <span className="text-xs font-semibold px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
                        COD · {o.paymentStatus}
                      </span>
                    ) : (
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${PAYMENT_STATUS_COLORS[o.paymentStatus] || 'bg-gray-100 text-gray-700'}`}>
                        Online · {o.paymentStatus}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${ORDER_STATUS_COLORS[o.orderStatus] || 'bg-gray-100 text-gray-700'}`}>
                      {o.orderStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setSelectedId(o._id)} className="p-1.5 rounded-lg hover:bg-forest-100 text-forest-400 hover:text-forest-900 transition-colors">
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-forest-100">
            <p className="text-xs text-forest-500">Page {page} of {pages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="p-1.5 rounded-lg border border-forest-200 text-forest-500 disabled:opacity-30 hover:bg-forest-50">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page >= pages}
                className="p-1.5 rounded-lg border border-forest-200 text-forest-500 disabled:opacity-30 hover:bg-forest-50">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedId && (
        <OrderDrawer
          orderId={selectedId}
          onClose={() => setSelectedId(null)}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  )
}
