const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  name: String,
  image: String,
  price: Number,
  quantity: { type: Number, default: 1 },
  isFreeGift: { type: Boolean, default: false },
  originalPrice: Number,
  packageLabel: String,
  packageQuantity: { type: Number, default: 1 },
  packagePrice: Number,
});

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    unique: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  // Guest checkout support
  guestInfo: {
    name: String,
    email: String,
    phone: String,
  },
  items: [orderItemSchema],
  shippingAddress: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: String,
    line1: { type: String, required: true },
    line2: String,
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
  },
  subtotal: { type: Number, required: true },
  shippingCharge: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  couponCode: String,
  couponType: { type: String, enum: ['percentage', 'fixed', 'free_gift'] },
  couponApplicationMode: { type: String, enum: ['auto', 'manual'] },
  total: { type: Number, required: true },
  paymentMethod: {
    type: String,
    enum: ['razorpay', 'cod', 'partial_cod'],
    required: true,
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded', 'partially_paid', 'fully_paid', 'partially_refunded'],
    default: 'pending',
  },
  // 'razorpay' for online/partial COD payments, 'cod' for cash on delivery
  paymentGateway: { type: String, default: 'razorpay' },
  paymentCapturedAt: Date,
  // ── Partial COD breakdown (only set when paymentMethod === 'partial_cod') ──
  advancePercentage: Number,   // e.g. 30 — % paid online up front
  codPercentage: Number,       // e.g. 70 — % collected as COD on delivery
  paidOnlineAmount: Number,    // total * advancePercentage / 100
  remainingCodAmount: Number,  // total - paidOnlineAmount
  razorpayOrderId: String,
  razorpayPaymentId: String,
  razorpaySignature: String,

  // ── Refunds (full or partial, via Razorpay Refunds API) ───────────────────
  refunds: [
    {
      refundId: String,
      amount: Number,
      status: { type: String, enum: ['pending', 'processed', 'failed'], default: 'pending' },
      notes: String,
      createdAt: { type: Date, default: Date.now },
    },
  ],
  orderStatus: {
    type: String,
    enum: ['placed', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'],
    default: 'placed',
  },
  trackingNumber: String,
  trackingUrl: String,
  notes: String,
  statusHistory: [
    {
      status: String,
      timestamp: { type: Date, default: Date.now },
      note: String,
    },
  ],
  viewedByAdmin: { type: Boolean, default: false },
  confirmationEmailSent: { type: Boolean, default: false },
  // true once payment is confirmed — gates admin visibility for online/partial-COD orders
  paymentVerified: { type: Boolean, default: false, index: true },
  isGift: { type: Boolean, default: false },
  giftMessage: String,
  deliveredAt: Date,
  cancelledAt: Date,
  cancelReason: String,

  // ── Shiprocket integration ──────────────────────────────────────────────
  shiprocketOrderId: String,  // Shiprocket's order_id (from /orders/create/adhoc)
  shipmentId: String,         // Shiprocket's shipment_id — needed for AWB/pickup calls
  awbCode: String,            // Courier AWB / waybill number once assigned
  courierName: String,
  pickupRequested: { type: Boolean, default: false },
  shippingStatus: {
    type: String,
    enum: ['not_created', 'created', 'ready_to_ship', 'pickup_scheduled', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'cancelled', 'rto'],
    default: 'not_created',
  },
  // Kept separate from `trackingUrl` above (admin-entered manual tracking)
  // so the auto-synced Shiprocket link never overwrites a manual override.
  shiprocketTrackingUrl: String,
  shiprocketResponse: mongoose.Schema.Types.Mixed,
  shiprocketError: String,
  // One of: AUTH_FAILED, TOKEN_EXPIRED, ORDER_CREATE_FAILED, AWB_FAILED, PICKUP_FAILED
  shiprocketErrorCode: String,
}, { timestamps: true });

// Auto-generate orderId
orderSchema.pre('save', async function (next) {
  if (!this.orderId) {
    const date = new Date();
    const prefix = 'AV'; // Arebianveda
    const timestamp = date.getTime().toString().slice(-8);
    this.orderId = `${prefix}${timestamp}`;
  }
  // Auto-push status history only when orderStatus changes and the caller
  // has NOT already pushed a history entry (to avoid duplicates when the
  // controller adds a note-aware entry itself).
  if (this.isModified('orderStatus') && !this.isModified('statusHistory')) {
    this.statusHistory.push({ status: this.orderStatus });
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
