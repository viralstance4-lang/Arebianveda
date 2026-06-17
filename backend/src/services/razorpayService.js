const Razorpay = require('razorpay');
const crypto = require('crypto');

let instance = null;

// Lazy init — avoids crashing on startup if keys aren't set yet
const getInstance = () => {
  if (!instance) {
    instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return instance;
};

const isConfigured = () => !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

// Retries transient failures (network errors / 5xx). Client errors (4xx —
// bad request, invalid params, auth) are not retried since retrying won't help.
const withRetry = async (fn, retries = 2) => {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const status = err.statusCode || err.status;
      if (status && status < 500) throw err;
      if (attempt < retries) await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
    }
  }
  throw lastErr;
};

// Create a Razorpay order — amount is in paise
const createOrder = ({ amount, currency = 'INR', receipt, notes }) =>
  withRetry(() => getInstance().orders.create({ amount, currency, receipt, notes }));

// Fetch a payment by ID — used to confirm the captured amount before trusting the frontend
const fetchPayment = (paymentId) =>
  withRetry(() => getInstance().payments.fetch(paymentId));

// Issue a full or partial refund — amount is in paise; omit amount for a full refund
const createRefund = (paymentId, { amount, notes } = {}) =>
  withRetry(() => getInstance().payments.refund(paymentId, {
    ...(amount != null ? { amount } : {}),
    ...(notes ? { notes } : {}),
  }));

// Verifies the signature returned by Razorpay Checkout after a successful payment
const verifyPaymentSignature = ({ orderId, paymentId, signature }) => {
  const body = `${orderId}|${paymentId}`;
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body).digest('hex');
  return expected === signature;
};

// Verifies the x-razorpay-signature header on incoming webhooks against the raw request body
const verifyWebhookSignature = ({ rawBody, signature }) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
  if (!secret || !rawBody || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return expected === signature;
};

module.exports = {
  isConfigured,
  createOrder,
  fetchPayment,
  createRefund,
  verifyPaymentSignature,
  verifyWebhookSignature,
};
