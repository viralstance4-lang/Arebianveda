/**
 * Shiprocket integration service.
 *
 * Handles authentication (login, token caching, auto-refresh on expiry,
 * retry on failure) and wraps the Shiprocket External API v1 endpoints
 * used for order creation, AWB assignment, pickup requests, tracking and
 * cancellation.
 *
 * Controllers never call the Shiprocket API directly — everything goes
 * through here, and credentials never leave the backend.
 *
 * Env vars:
 *   SHIPROCKET_EMAIL                       (required)
 *   SHIPROCKET_PASSWORD                    (required)
 *   SHIPROCKET_PICKUP_LOCATION              optional, default "Primary" —
 *                                            must match a pickup address
 *                                            nickname configured in the
 *                                            Shiprocket dashboard
 *   SHIPROCKET_PKG_LENGTH/BREADTH/HEIGHT    optional, default 10 (cm) each
 */

const Product = require('../models/Product');

const BASE_URL = 'https://apiv2.shiprocket.in/v1/external';

let cachedToken = null;
let tokenExpiresAt = 0;

// Short cooldown on repeated failed logins — avoids hammering Shiprocket's
// auth endpoint (and risking/extending an account block) every time an order
// is synced while credentials are invalid or the account is blocked.
let lastLoginError = null;
let lastLoginErrorAt = 0;
const LOGIN_ERROR_COOLDOWN_MS = 60 * 1000;

const isConfigured = () => !!(process.env.SHIPROCKET_EMAIL && process.env.SHIPROCKET_PASSWORD);

// Startup check — call once when the server boots. Logs a warning for each
// missing credential so misconfiguration is obvious in the server logs
// instead of surfacing later as a cryptic "Invalid email and password" error.
function validateConfig() {
  let ok = true;
  if (!process.env.SHIPROCKET_EMAIL) {
    console.warn('[Shiprocket] Missing SHIPROCKET_EMAIL — Shiprocket sync is disabled');
    ok = false;
  }
  if (!process.env.SHIPROCKET_PASSWORD) {
    console.warn('[Shiprocket] Missing SHIPROCKET_PASSWORD — Shiprocket sync is disabled');
    ok = false;
  }
  if (ok) console.log('[Shiprocket] Credentials configured (SHIPROCKET_EMAIL / SHIPROCKET_PASSWORD present)');
  return ok;
}

async function login() {
  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;
  if (!email || !password) {
    const err = new Error('Shiprocket is not configured (SHIPROCKET_EMAIL / SHIPROCKET_PASSWORD missing)');
    err.code = 'AUTH_FAILED';
    throw err;
  }

  if (lastLoginError && Date.now() - lastLoginErrorAt < LOGIN_ERROR_COOLDOWN_MS) {
    throw lastLoginError;
  }

  console.log(`[Shiprocket] POST ${BASE_URL}/auth/login (email: ${email})`);

  let res;
  try {
    res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  } catch (networkErr) {
    console.error(`[Shiprocket] Login request failed (network error): ${networkErr.message}`);
    const err = new Error(`Shiprocket login request failed: ${networkErr.message}`);
    err.code = 'AUTH_FAILED';
    throw err;
  }

  const data = await res.json().catch(() => ({}));
  console.log(`[Shiprocket] Login response status: ${res.status}`);
  // Never log the password. The login response itself never contains it,
  // but redact the token too so it doesn't end up in log aggregators.
  console.log('[Shiprocket] Login response body:', JSON.stringify({ ...data, token: data.token ? '<redacted>' : undefined }));

  if (!res.ok || !data.token) {
    console.error(`[Shiprocket] Token generation FAILED — ${data.message || `HTTP ${res.status}`}`);
    const err = new Error(data.message || `Shiprocket login failed (${res.status})`);
    err.code = 'AUTH_FAILED';
    err.shiprocketResponse = data;
    lastLoginError = err;
    lastLoginErrorAt = Date.now();
    throw err;
  }

  console.log('[Shiprocket] Token generation SUCCESS');
  cachedToken = data.token;
  // Tokens are valid ~10 days — refresh a day early to be safe
  tokenExpiresAt = Date.now() + 9 * 24 * 60 * 60 * 1000;
  lastLoginError = null;
  return cachedToken;
}

async function getToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;
  return login();
}

// Low-level request wrapper: attaches the bearer token, retries once on a
// 401 (expired/invalid token, forcing a fresh login), and retries up to
// twice more on network errors with a short backoff.
async function request(method, path, body, opts = {}) {
  const { retriedAuth = false, networkAttempt = 1 } = opts;
  const token = await getToken();

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    if (networkAttempt < 3) {
      await new Promise(r => setTimeout(r, 500 * networkAttempt));
      return request(method, path, body, { retriedAuth, networkAttempt: networkAttempt + 1 });
    }
    throw new Error(`Shiprocket request failed: ${networkErr.message}`);
  }

  const data = await res.json().catch(() => ({}));

  if (res.status === 401 && !retriedAuth) {
    console.warn(`[Shiprocket] 401 on ${method} ${path} — token expired/invalid, re-authenticating`);
    cachedToken = null;
    return request(method, path, body, { retriedAuth: true, networkAttempt });
  }

  if (!res.ok) {
    const message = data?.message
      || (data?.errors && JSON.stringify(data.errors))
      || `Shiprocket API error (${res.status})`;
    const err = new Error(message);
    err.shiprocketResponse = data;
    err.status = res.status;
    if (res.status === 401) err.code = 'TOKEN_EXPIRED';
    throw err;
  }

  return data;
}

// ── Status mapping (Shiprocket → our shippingStatus enum) ────────────────────
const STATUS_MAP = {
  'NEW': 'created',
  'INVOICED': 'created',
  'READY TO SHIP': 'ready_to_ship',
  'PICKUP SCHEDULED': 'pickup_scheduled',
  'PICKUP GENERATED': 'pickup_scheduled',
  'PICKUP QUEUED': 'pickup_scheduled',
  'PICKED UP': 'shipped',
  'SHIPPED': 'shipped',
  'IN TRANSIT': 'in_transit',
  'OUT FOR DELIVERY': 'out_for_delivery',
  'DELIVERED': 'delivered',
  'CANCELED': 'cancelled',
  'CANCELLED': 'cancelled',
  'RTO INITIATED': 'rto',
  'RTO IN TRANSIT': 'rto',
  'RTO DELIVERED': 'rto',
  'RTO ACKNOWLEDGED': 'rto',
};

function mapShiprocketStatus(status) {
  if (!status) return null;
  return STATUS_MAP[String(status).toUpperCase().trim()] || null;
}

// ── Build the /orders/create/adhoc payload from a Mongo Order document ───────
const PAYMENT_METHOD_MAP = { cod: 'COD', partial_cod: 'COD', razorpay: 'Prepaid' };

async function buildOrderPayload(order, opts = {}) {
  const productIds = order.items.map(item => item.product?._id || item.product);
  const products = await Product.find({ _id: { $in: productIds } }).select('weight');
  const weightById = new Map(products.map(p => [String(p._id), p.weight || 0]));

  // Build line items. Shiprocket rejects duplicate SKUs, so we append the
  // package label (if any) to make each variant's SKU unique within the order.
  const orderItems = order.items.map(item => {
    const productId = String(item.product?._id || item.product);
    const sku = item.packageLabel
      ? `${productId}_${item.packageLabel.replace(/[^a-zA-Z0-9]/g, '_')}`
      : productId;
    return {
      name: item.packageLabel ? `${item.name} (${item.packageLabel})` : item.name,
      sku,
      units: item.quantity,
      selling_price: item.price,
    };
  });

  const totalWeightGrams = order.items.reduce((sum, item) => {
    const productId = String(item.product?._id || item.product);
    const perUnitGrams = weightById.get(productId) || 100; // fallback if product has no weight set
    return sum + perUnitGrams * item.quantity;
  }, 0);
  const weightKg = Math.max(totalWeightGrams / 1000, 0.1);

  const [firstName, ...rest] = (order.shippingAddress.name || 'Customer').trim().split(/\s+/);
  const lastName = rest.join(' ');

  const billingEmail = order.guestInfo?.email || order.user?.email || opts.email || 'no-reply@arebianveda.com';
  const billingPhone = (order.shippingAddress.phone || '').replace(/\D/g, '').slice(-10);

  const orderDate = new Date(order.createdAt || Date.now()).toISOString().slice(0, 19).replace('T', ' ');

  // Amount the delivery partner must collect at the door:
  // partial_cod → only the remaining balance (advance was already paid online via Razorpay)
  // cod         → full order total
  // razorpay    → 0 (fully prepaid, delivery partner collects nothing)
  const codAmount =
    order.paymentMethod === 'partial_cod' ? (order.remainingCodAmount || 0)
    : order.paymentMethod === 'cod'       ? (order.total || 0)
    : 0;

  // For partial COD, Shiprocket uses sub_total as the COD collection amount.
  // The customer already paid paidOnlineAmount online, so we send only the
  // remaining balance as sub_total so Shiprocket tells the courier to collect
  // the correct amount. shipping and discount are zeroed out (already absorbed
  // into the total split). cod_amount is set explicitly as well.
  const isPartialCod = order.paymentMethod === 'partial_cod';
  const shiprocketSubTotal    = isPartialCod ? (order.remainingCodAmount || 0) : order.subtotal;
  const shiprocketShipping    = isPartialCod ? 0 : (order.shippingCharge || 0);
  const shiprocketDiscount    = isPartialCod ? 0 : (order.discount || 0);

  return {
    order_id: opts.shiprocketOrderId || order.orderId,
    order_date: orderDate,
    pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || 'Primary',
    billing_customer_name: firstName,
    billing_last_name: lastName,
    billing_address: order.shippingAddress.line1,
    billing_address_2: order.shippingAddress.line2 || '',
    billing_city: order.shippingAddress.city,
    billing_pincode: order.shippingAddress.pincode,
    billing_state: order.shippingAddress.state,
    billing_country: 'India',
    billing_email: billingEmail,
    billing_phone: billingPhone,
    shipping_is_billing: true,
    order_items: orderItems,
    payment_method: PAYMENT_METHOD_MAP[order.paymentMethod] || 'Prepaid',
    sub_total: shiprocketSubTotal,
    shipping_charges: shiprocketShipping,
    discount: shiprocketDiscount,
    ...(codAmount > 0 && { cod_amount: codAmount }),
    length: Number(process.env.SHIPROCKET_PKG_LENGTH) || 10,
    breadth: Number(process.env.SHIPROCKET_PKG_BREADTH) || 10,
    height: Number(process.env.SHIPROCKET_PKG_HEIGHT) || 10,
    weight: Number(weightKg.toFixed(2)),
  };
}

// ── High-level operations (build payload + call API + update + save order) ───

// Push an order to Shiprocket (auto on creation, or admin "Create Shipment" / "Retry Sync").
// Never throws — failures are recorded on the order so the website order is
// never blocked by a Shiprocket outage.
async function syncOrder(order, opts = {}) {
  if (!isConfigured()) {
    order.shippingStatus = 'not_created';
    order.shiprocketError = 'Shiprocket is not configured (SHIPROCKET_EMAIL / SHIPROCKET_PASSWORD missing)';
    order.shiprocketErrorCode = 'AUTH_FAILED';
    await order.save();
    return order;
  }

  try {
    const payload = await buildOrderPayload(order, opts);
    const data = await request('POST', '/orders/create/adhoc', payload);

    // Shiprocket occasionally returns 200 with a validation error and no order_id.
    // Treat missing order_id as a failure so the admin can see and retry it.
    if (data.order_id == null) {
      const errMsg = data.message || 'Shiprocket returned no order_id (possible validation error)';
      console.error(`[Shiprocket] Order create returned no order_id for ${order.orderId}: ${errMsg}`);
      order.shippingStatus = 'not_created';
      order.shiprocketError = errMsg;
      order.shiprocketErrorCode = 'ORDER_CREATE_FAILED';
      order.shiprocketResponse = data;
      await order.save();
      return order;
    }

    order.shiprocketOrderId = String(data.order_id);
    order.shipmentId = data.shipment_id != null ? String(data.shipment_id) : order.shipmentId;
    order.shippingStatus = 'created';
    order.shiprocketResponse = data;
    order.shiprocketError = undefined;
    order.shiprocketErrorCode = undefined;
  } catch (err) {
    order.shippingStatus = 'not_created';
    order.shiprocketError = err.message;
    order.shiprocketErrorCode = err.code || 'ORDER_CREATE_FAILED';
    if (err.shiprocketResponse) order.shiprocketResponse = err.shiprocketResponse;
    console.error(`[Shiprocket] syncOrder failed for ${order.orderId} [${order.shiprocketErrorCode}]: ${err.message}`);
  }

  await order.save();
  return order;
}

// Assign an AWB (and courier) for a shipment that's already been created.
async function assignAWB(order) {
  if (!order.shipmentId) throw new Error('Order has not been created in Shiprocket yet');

  let data;
  try {
    data = await request('POST', '/courier/assign/awb', { shipment_id: Number(order.shipmentId) });
  } catch (err) {
    err.code = err.code || 'AWB_FAILED';
    throw err;
  }
  const shipment = data?.response?.data || {};

  if (shipment.awb_code) order.awbCode = String(shipment.awb_code);
  if (shipment.courier_name) order.courierName = shipment.courier_name;
  if (order.awbCode) order.shippingStatus = 'ready_to_ship';
  order.shiprocketResponse = data;

  await order.save();
  return order;
}

// Request courier pickup for a shipment that already has an AWB.
async function requestPickup(order) {
  if (!order.shipmentId) throw new Error('Order has not been created in Shiprocket yet');

  let data;
  try {
    data = await request('POST', '/courier/generate/pickup', { shipment_id: [Number(order.shipmentId)] });
  } catch (err) {
    err.code = err.code || 'PICKUP_FAILED';
    throw err;
  }

  order.pickupRequested = true;
  order.shippingStatus = 'pickup_scheduled';
  order.shiprocketResponse = data;

  await order.save();
  return order;
}

// "Ship Now": generate AWB (if needed) then request pickup (if needed).
async function shipNow(order) {
  if (!order.awbCode) await assignAWB(order);
  if (!order.pickupRequested) await requestPickup(order);
  return order;
}

// Refresh tracking info from Shiprocket for an order that has an AWB.
async function track(order) {
  if (!order.awbCode) throw new Error('No AWB assigned yet — generate AWB first');

  const data = await request('GET', `/courier/track/awb/${order.awbCode}`);
  const trackData = data?.tracking_data || {};
  const latestActivity = trackData?.shipment_track?.[0] || {};

  const mapped = mapShiprocketStatus(trackData.shipment_status_label || trackData.current_status || latestActivity.current_status);
  if (mapped) order.shippingStatus = mapped;
  if (latestActivity.courier_name) order.courierName = latestActivity.courier_name;
  if (trackData.track_url) order.shiprocketTrackingUrl = trackData.track_url;
  order.shiprocketResponse = data;

  if (mapped === 'delivered' && !order.deliveredAt) order.deliveredAt = new Date();

  await order.save();
  return { order, tracking: data };
}

// Best-effort cancel in Shiprocket (e.g. when admin cancels the order on the website).
async function cancelShiprocketOrder(order) {
  if (!order.shiprocketOrderId || !isConfigured()) return order;
  try {
    await request('POST', '/orders/cancel', { ids: [Number(order.shiprocketOrderId)] });
  } catch (err) {
    order.shiprocketError = err.message;
  }
  return order;
}

// ── Diagnostics ───────────────────────────────────────────────────────────────

// Used by GET /api/shipping/health and the `shiprocket:test` script.
// Confirms credentials are configured and a token can be obtained (from cache
// or via a fresh login). Never throws — always resolves to a status object.
async function healthCheck() {
  if (!isConfigured()) {
    return {
      success: false,
      authenticated: false,
      tokenReceived: false,
      error: 'Shiprocket is not configured (SHIPROCKET_EMAIL / SHIPROCKET_PASSWORD missing)',
      code: 'AUTH_FAILED',
    };
  }

  try {
    const token = await getToken();
    return { success: true, authenticated: true, tokenReceived: !!token };
  } catch (err) {
    return {
      success: false,
      authenticated: false,
      tokenReceived: false,
      error: err.message,
      code: err.code || 'AUTH_FAILED',
    };
  }
}

// Pickup addresses + the company info attached to them — useful as a
// "is this token actually usable" sanity check beyond just login succeeding.
async function getAccountDetails() {
  return request('GET', '/settings/company/pickup');
}

module.exports = {
  isConfigured,
  validateConfig,
  healthCheck,
  getAccountDetails,
  syncOrder,
  assignAWB,
  requestPickup,
  shipNow,
  track,
  cancelShiprocketOrder,
  mapShiprocketStatus,
};
