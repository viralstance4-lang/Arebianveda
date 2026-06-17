export const fmtINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

export const ORDER_STATUSES = ['placed', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned']

export const ORDER_STATUS_COLORS = {
  placed: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-cyan-100 text-cyan-700',
  processing: 'bg-purple-100 text-purple-700',
  shipped: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  returned: 'bg-gray-200 text-gray-700',
}

export const PAYMENT_STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  refunded: 'bg-gray-200 text-gray-700',
  partially_paid: 'bg-orange-100 text-orange-700',
  fully_paid: 'bg-green-100 text-green-700',
  partially_refunded: 'bg-purple-100 text-purple-700',
}

export const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded', 'partially_paid', 'fully_paid', 'partially_refunded']

export const PAYMENT_METHOD_LABELS = {
  razorpay: 'Online Payment',
  cod: 'Cash on Delivery',
  partial_cod: 'Partial COD',
}

export const REFUND_STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  processed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
}

export const SHIPPING_STATUSES = ['not_created', 'created', 'ready_to_ship', 'pickup_scheduled', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'cancelled', 'rto']

export const SHIPPING_STATUS_COLORS = {
  not_created: 'bg-gray-200 text-gray-700',
  created: 'bg-blue-100 text-blue-700',
  ready_to_ship: 'bg-cyan-100 text-cyan-700',
  pickup_scheduled: 'bg-purple-100 text-purple-700',
  shipped: 'bg-indigo-100 text-indigo-700',
  in_transit: 'bg-indigo-100 text-indigo-700',
  out_for_delivery: 'bg-orange-100 text-orange-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  rto: 'bg-red-100 text-red-700',
}

export const SHIPPING_STATUS_LABELS = {
  not_created: 'Not Created',
  created: 'Created',
  ready_to_ship: 'Ready To Ship',
  pickup_scheduled: 'Pickup Scheduled',
  shipped: 'Shipped',
  in_transit: 'In Transit',
  out_for_delivery: 'Out For Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  rto: 'RTO',
}
