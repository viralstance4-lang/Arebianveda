const Order = require('../models/Order');
const Product = require('../models/Product');
const shiprocketService = require('../services/shiprocketService');

async function loadOrder(req, res) {
  const order = await Order.findById(req.params.id).populate('user', 'email');
  if (!order) {
    res.status(404).json({ success: false, message: 'Order not found' });
    return null;
  }
  return order;
}

// ── GET /api/shipping/health ───────────────────────────────────────────────
// Diagnostics: confirms SHIPROCKET_EMAIL/PASSWORD are configured and a token
// can be obtained. Does not touch any order.
exports.health = async (req, res) => {
  const result = await shiprocketService.healthCheck();
  if (result.success) {
    return res.json({ success: true, authenticated: true, tokenReceived: result.tokenReceived });
  }
  res.json({ success: false, error: result.error, code: result.code });
};

// ── POST /api/shipping/admin/:id/create ───────────────────────────────────────
// Used for both "Create Shipment" (first attempt) and "Retry Sync" (after a
// previous failure) — Shiprocket's create/adhoc is idempotent on order_id.
exports.createShipment = async (req, res) => {
  const order = await loadOrder(req, res);
  if (!order) return;

  await shiprocketService.syncOrder(order);

  if (order.shippingStatus === 'not_created') {
    return res.status(502).json({ success: false, message: order.shiprocketError, order });
  }
  res.json({ success: true, order });
};

// ── POST /api/shipping/admin/:id/ship-now ───────────────────────────────────────
// Generates AWB (assigns courier) and requests pickup in one go.
exports.shipNow = async (req, res) => {
  const order = await loadOrder(req, res);
  if (!order) return;

  try {
    await shiprocketService.shipNow(order);
    res.json({ success: true, order });
  } catch (err) {
    res.status(502).json({ success: false, message: err.message, code: err.code, order });
  }
};

// ── POST /api/shipping/admin/:id/generate-awb ─────────────────────────────────
exports.generateAWB = async (req, res) => {
  const order = await loadOrder(req, res);
  if (!order) return;

  try {
    await shiprocketService.assignAWB(order);
    res.json({ success: true, order });
  } catch (err) {
    res.status(502).json({ success: false, message: err.message, code: err.code, order });
  }
};

// ── POST /api/shipping/admin/:id/request-pickup ───────────────────────────────
exports.requestPickup = async (req, res) => {
  const order = await loadOrder(req, res);
  if (!order) return;

  try {
    await shiprocketService.requestPickup(order);
    res.json({ success: true, order });
  } catch (err) {
    res.status(502).json({ success: false, message: err.message, code: err.code, order });
  }
};

// ── POST /api/shipping/admin/:id/re-sync ──────────────────────────────────────
// Force re-push to Shiprocket regardless of current shippingStatus.
// Cancels the existing Shiprocket order (best-effort) then creates a fresh one.
// Useful when the order was synced with wrong data (e.g. wrong COD amount).
exports.reSyncShipment = async (req, res) => {
  const order = await loadOrder(req, res);
  if (!order) return;

  // Best-effort cancel of the existing Shiprocket order before re-creating
  if (order.shiprocketOrderId) {
    await shiprocketService.cancelShiprocketOrder(order);
  }

  // Reset all Shiprocket fields so syncOrder treats this as a fresh push
  order.shippingStatus = 'not_created';
  order.shiprocketOrderId = undefined;
  order.shipmentId = undefined;
  order.awbCode = undefined;
  order.courierName = undefined;
  order.pickupRequested = false;
  order.shiprocketError = undefined;
  order.shiprocketErrorCode = undefined;

  // Shiprocket won't re-create a cancelled order under the same order_id,
  // so we send a "-RS" suffixed id to force a fresh entry.
  await shiprocketService.syncOrder(order, {
    email: order.user?.email,
    shiprocketOrderId: `${order.orderId}-RS`,
  });

  if (order.shippingStatus === 'not_created') {
    return res.status(502).json({ success: false, message: order.shiprocketError, order });
  }
  res.json({ success: true, order });
};

// ── GET /api/shipping/admin/:id/track ─────────────────────────────────────────
// Admin-triggered refresh of tracking info from Shiprocket.
exports.trackOrderAdmin = async (req, res) => {
  const order = await loadOrder(req, res);
  if (!order) return;

  try {
    const { tracking } = await shiprocketService.track(order);
    res.json({ success: true, order, tracking });
  } catch (err) {
    res.status(502).json({ success: false, message: err.message, order });
  }
};

// ── GET /api/shipping/track/:orderId — public ─────────────────────────────────
exports.trackOrderPublic = async (req, res) => {
  const order = await Order.findOne({ orderId: req.params.orderId })
    .select('orderId orderStatus shippingStatus awbCode courierName shiprocketTrackingUrl trackingNumber trackingUrl statusHistory createdAt deliveredAt');
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  res.json({ success: true, order });
};

// ── POST /api/shipping/webhook — Shiprocket webhook receiver ─────────────────
exports.webhook = async (req, res) => {
  // Optional shared-secret verification (Settings > API > Webhooks in Shiprocket)
  const expectedToken = process.env.SHIPROCKET_WEBHOOK_TOKEN;
  if (expectedToken) {
    const received = req.headers['x-api-key'] || req.headers['x-webhook-token'];
    if (received !== expectedToken) {
      return res.status(401).json({ success: false, message: 'Invalid webhook token' });
    }
  }

  const payload = req.body || {};

  const candidates = [];
  if (payload.channel_order_id) candidates.push({ orderId: String(payload.channel_order_id) });
  if (payload.order_id) candidates.push({ shiprocketOrderId: String(payload.order_id) }, { orderId: String(payload.order_id) });
  if (payload.awb) candidates.push({ awbCode: String(payload.awb) });

  const order = candidates.length ? await Order.findOne({ $or: candidates }) : null;
  if (!order) return res.json({ success: true }); // ack — nothing to update

  const mapped = shiprocketService.mapShiprocketStatus(payload.current_status || payload.shipment_status);
  if (mapped) order.shippingStatus = mapped;
  if (payload.awb && !order.awbCode) order.awbCode = String(payload.awb);
  if (payload.courier_name) order.courierName = payload.courier_name;
  if (payload.track_url) order.shiprocketTrackingUrl = payload.track_url;

  // Mirror key shipping transitions onto orderStatus, same rules as the
  // admin "Update Status" flow (orderController.updateOrderStatus).
  if (mapped === 'shipped' && ['placed', 'confirmed', 'processing'].includes(order.orderStatus)) {
    order.orderStatus = 'shipped';
  }
  if (mapped === 'delivered' && order.orderStatus !== 'delivered') {
    order.orderStatus = 'delivered';
    order.deliveredAt = new Date();
    if (order.paymentMethod === 'cod' && order.paymentStatus === 'pending') order.paymentStatus = 'paid';
    if (order.paymentMethod === 'partial_cod' && order.paymentStatus === 'partially_paid') order.paymentStatus = 'fully_paid';
  }
  if (mapped === 'cancelled' && order.orderStatus !== 'cancelled') {
    order.orderStatus = 'cancelled';
    order.cancelledAt = new Date();
    order.cancelReason = 'Cancelled via Shiprocket';
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity, sold: -item.quantity } });
    }
  }
  if (mapped === 'rto' && order.orderStatus !== 'returned') {
    order.orderStatus = 'returned';
  }

  if (mapped) {
    order.statusHistory.push({
      status: order.orderStatus,
      note: `Shiprocket: ${payload.current_status || payload.shipment_status || mapped}`,
      timestamp: new Date(),
    });
  }

  await order.save();

  req.app.emitAdminEvent?.('shipping:update', { orderId: order.orderId, shippingStatus: order.shippingStatus, orderStatus: order.orderStatus });

  res.json({ success: true });
};
