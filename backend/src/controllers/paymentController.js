const Order = require('../models/Order');
const User = require('../models/User');
const { sendOrderConfirmationEmail } = require('../services/emailService');
const razorpayService = require('../services/razorpayService');
const shiprocketService = require('../services/shiprocketService');

const ensureConfigured = (res) => {
  if (!razorpayService.isConfigured()) {
    console.error('[Razorpay] Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET in environment');
    res.status(500).json({ success: false, message: 'Payment gateway not configured. Please contact support.' });
    return false;
  }
  return true;
};

// Sends the order-confirmation email at most once, even if the frontend's
// verify call and the webhook both fire for the same payment.
// Returns true if the email was successfully dispatched, false otherwise.
const sendConfirmationOnce = async (order) => {
  try {
    const claimed = await Order.findOneAndUpdate(
      { _id: order._id, confirmationEmailSent: false },
      { confirmationEmailSent: true }
    );
    const emailTo = order.shippingAddress?.email || order.guestInfo?.email ||
      (order.user ? (await User.findById(order.user).select('email'))?.email : null);
    if (claimed && emailTo) {
      await sendOrderConfirmationEmail(order, emailTo);
      return true;
    }
    return false;
  } catch (emailErr) {
    console.error('[Email] Failed to send confirmation:', emailErr.message);
    return false;
  }
};

// Create Razorpay order — covers both Online Payment (full amount) and
// Partial COD (advance amount only)
exports.createRazorpayOrder = async (req, res) => {
  if (!ensureConfigured(res)) return;

  const { orderId } = req.body;

  const order = await Order.findById(orderId);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

  // Partial COD only charges the advance portion online — the rest is collected on delivery.
  const chargeAmount = order.paymentMethod === 'partial_cod'
    ? order.paidOnlineAmount
    : order.total;

  const rzpOrder = await razorpayService.createOrder({
    amount: Math.round(chargeAmount * 100), // paise
    currency: 'INR',
    receipt: order.orderId,
    notes: {
      orderId: order._id.toString(),
      customerName: order.shippingAddress.name,
    },
  });

  order.razorpayOrderId = rzpOrder.id;
  order.paymentGateway = 'razorpay';
  await order.save();

  res.json({
    success: true,
    key: process.env.RAZORPAY_KEY_ID,
    amount: rzpOrder.amount,
    currency: rzpOrder.currency,
    razorpayOrderId: rzpOrder.id,
    orderId: order._id,
    orderNumber: order.orderId,
    name: order.shippingAddress.name,
    email: order.guestInfo?.email || '',
    phone: order.shippingAddress.phone,
  });
};

// Verify Razorpay payment — never trusts the frontend; re-checks signature,
// order ownership and the actual captured amount against Razorpay itself.
exports.verifyPayment = async (req, res) => {
  if (!ensureConfigured(res)) return;

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId) {
    return res.status(400).json({ success: false, message: 'Missing payment verification fields' });
  }

  if (!razorpayService.verifyPaymentSignature({ orderId: razorpay_order_id, paymentId: razorpay_payment_id, signature: razorpay_signature })) {
    return res.status(400).json({ success: false, message: 'Payment verification failed' });
  }

  const order = await Order.findById(orderId);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

  if (order.razorpayOrderId !== razorpay_order_id) {
    return res.status(400).json({ success: false, message: 'Order mismatch' });
  }

  // Idempotent — duplicate callback (frontend handler + webhook both firing for the same payment)
  if (order.razorpayPaymentId === razorpay_payment_id && ['paid', 'partially_paid', 'fully_paid'].includes(order.paymentStatus)) {
    return res.json({ success: true, order, emailSent: order.confirmationEmailSent });
  }

  // Confirm the amount actually captured by Razorpay matches what we expected to charge
  const chargeAmount = order.paymentMethod === 'partial_cod' ? order.paidOnlineAmount : order.total;
  let payment;
  try {
    payment = await razorpayService.fetchPayment(razorpay_payment_id);
  } catch (err) {
    console.error('[Razorpay] Failed to fetch payment for verification:', err.message);
    return res.status(502).json({ success: false, message: 'Could not confirm payment with Razorpay. Please try again or contact support.' });
  }
  if (Number(payment.amount) !== Math.round(chargeAmount * 100)) {
    console.error(`[Razorpay] Amount mismatch for order ${order.orderId}: expected ${Math.round(chargeAmount * 100)}, got ${payment.amount}`);
    return res.status(400).json({ success: false, message: 'Payment amount mismatch' });
  }

  // Partial COD: the online charge only covers the advance — the remainder
  // is still owed via COD, so the order is "partially_paid", not "paid".
  order.paymentStatus = order.paymentMethod === 'partial_cod' ? 'partially_paid' : 'paid';
  order.orderStatus = 'confirmed';
  order.razorpayPaymentId = razorpay_payment_id;
  order.razorpaySignature = razorpay_signature;
  order.paymentGateway = 'razorpay';
  order.paymentCapturedAt = new Date();
  order.paymentVerified = true;
  await order.save();

  const emailSent = await sendConfirmationOnce(order);

  // Now that payment is verified, sync to Shiprocket (avoids phantom orders from abandoned payments)
  try {
    const emailFor = order.shippingAddress?.email || order.guestInfo?.email ||
      (order.user ? (await User.findById(order.user).select('email'))?.email : null);
    await shiprocketService.syncOrder(order, { email: emailFor });
  } catch (srErr) {
    console.error('[Shiprocket] Post-payment sync failed:', srErr.message);
  }

  // Order is now payment-verified — make it visible in the admin dashboard
  try {
    const [totalOrders, pendingOrders, unviewedCount] = await Promise.all([
      Order.countDocuments({ paymentVerified: true }),
      Order.countDocuments({ paymentVerified: true, orderStatus: { $in: ['placed', 'confirmed'] } }),
      Order.countDocuments({ paymentVerified: true, viewedByAdmin: false }),
    ]);
    req.app.emitAdminEvent?.('orders:update', { totalOrders, pendingOrders, unviewedCount, newOrder: { orderId: order.orderId, total: order.total } });
  } catch (socketErr) {
    console.error('[Socket] Admin notification failed:', socketErr.message);
  }

  res.json({ success: true, order, emailSent });
};

// Razorpay webhook — payment.captured / payment.failed / refund.processed
exports.webhook = async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    console.error('[Razorpay] Webhook received but no webhook/key secret is configured');
    return res.status(500).json({ success: false, message: 'Payment gateway not configured.' });
  }

  const signature = req.headers['x-razorpay-signature'];
  if (!razorpayService.verifyWebhookSignature({ rawBody: req.rawBody, signature })) {
    return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
  }

  const { event, payload } = req.body;

  if (event === 'payment.captured') {
    const paymentId = payload.payment.entity.id;
    const razorpayOrderId = payload.payment.entity.order_id;

    const existing = await Order.findOne({ razorpayOrderId });
    if (existing) {
      // Idempotent — skip if this exact payment was already processed (e.g. by verifyPayment)
      const alreadyProcessed = existing.razorpayPaymentId === paymentId &&
        ['paid', 'partially_paid', 'fully_paid'].includes(existing.paymentStatus);

      if (!alreadyProcessed) {
        const paymentStatus = existing.paymentMethod === 'partial_cod' ? 'partially_paid' : 'paid';
        const order = await Order.findOneAndUpdate(
          { razorpayOrderId },
          {
            paymentStatus,
            orderStatus: 'confirmed',
            razorpayPaymentId: paymentId,
            paymentGateway: 'razorpay',
            paymentCapturedAt: new Date(),
            paymentVerified: true,
          },
          { new: true }
        );
        if (order) {
          await sendConfirmationOnce(order);
          // Shiprocket sync — same logic as verifyPayment (webhook fires when frontend verify misses)
          try {
            const emailFor = order.shippingAddress?.email || order.guestInfo?.email ||
              (order.user ? (await User.findById(order.user).select('email'))?.email : null);
            await shiprocketService.syncOrder(order, { email: emailFor });
          } catch (srErr) {
            console.error('[Shiprocket] Webhook post-payment sync failed:', srErr.message);
          }
          try {
            const [totalOrders, pendingOrders, unviewedCount] = await Promise.all([
              Order.countDocuments({ paymentVerified: true }),
              Order.countDocuments({ paymentVerified: true, orderStatus: { $in: ['placed', 'confirmed'] } }),
              Order.countDocuments({ paymentVerified: true, viewedByAdmin: false }),
            ]);
            req.app.emitAdminEvent?.('orders:update', { totalOrders, pendingOrders, unviewedCount, newOrder: { orderId: order.orderId, total: order.total } });
          } catch (socketErr) {
            console.error('[Socket] Admin notification failed:', socketErr.message);
          }
        }
      }
    }
  }

  if (event === 'payment.failed') {
    const razorpayOrderId = payload.payment.entity.order_id;
    // Only mark as failed if it's still pending — never overwrite an already-paid order
    await Order.findOneAndUpdate({ razorpayOrderId, paymentStatus: 'pending' }, { paymentStatus: 'failed' });
  }

  if (event === 'refund.processed') {
    const refundEntity = payload.refund.entity;
    const refundId = refundEntity.id;
    const paymentId = refundEntity.payment_id;
    const amount = refundEntity.amount / 100;

    const order = await Order.findOne({ razorpayPaymentId: paymentId });
    if (order) {
      const existingRefund = order.refunds.find(r => r.refundId === refundId);
      if (existingRefund) {
        existingRefund.status = 'processed';
      } else {
        order.refunds.push({ refundId, amount, status: 'processed' });
      }

      const chargeAmount = order.paymentMethod === 'partial_cod' ? order.paidOnlineAmount : order.total;
      const totalRefunded = order.refunds
        .filter(r => r.status === 'processed')
        .reduce((sum, r) => sum + r.amount, 0);
      order.paymentStatus = totalRefunded >= chargeAmount ? 'refunded' : 'partially_refunded';
      await order.save();
    }
  }

  res.json({ success: true });
};

// Admin: issue a full or partial refund for an order's Razorpay payment
exports.issueRefund = async (req, res) => {
  if (!ensureConfigured(res)) return;

  const { id } = req.params;
  const { amount, notes } = req.body;

  const order = await Order.findById(id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  if (!order.razorpayPaymentId) {
    return res.status(400).json({ success: false, message: 'No Razorpay payment found for this order' });
  }

  const chargeAmount = order.paymentMethod === 'partial_cod' ? order.paidOnlineAmount : order.total;
  const alreadyRefunded = (order.refunds || [])
    .filter(r => r.status !== 'failed')
    .reduce((sum, r) => sum + r.amount, 0);
  const maxRefundable = chargeAmount - alreadyRefunded;

  const refundAmount = amount != null ? Number(amount) : maxRefundable;

  if (!(refundAmount > 0) || refundAmount > maxRefundable + 0.01) {
    return res.status(400).json({ success: false, message: `Invalid refund amount. Maximum refundable: ₹${maxRefundable}` });
  }

  let refund;
  try {
    refund = await razorpayService.createRefund(order.razorpayPaymentId, {
      amount: Math.round(refundAmount * 100),
      notes: notes ? { reason: notes } : undefined,
    });
  } catch (err) {
    console.error('[Razorpay] Refund failed:', err.message);
    return res.status(502).json({ success: false, message: err.error?.description || 'Refund request failed. Please try again.' });
  }

  order.refunds.push({
    refundId: refund.id,
    amount: refundAmount,
    status: refund.status === 'processed' ? 'processed' : 'pending',
    notes,
  });

  const totalRefunded = alreadyRefunded + refundAmount;
  order.paymentStatus = totalRefunded >= chargeAmount ? 'refunded' : 'partially_refunded';
  await order.save();

  res.json({ success: true, order });
};
