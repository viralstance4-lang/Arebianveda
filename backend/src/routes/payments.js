const express = require('express');
const router = express.Router();
const { optionalAuth, protect, adminOnly } = require('../middleware/auth');
const {
  createRazorpayOrder,
  verifyPayment,
  webhook,
  issueRefund,
} = require('../controllers/paymentController');

// Online Payment + Partial COD (advance) flow
router.post('/razorpay/create', optionalAuth, createRazorpayOrder);
router.post('/razorpay/verify', optionalAuth, verifyPayment);

// Spec-aligned aliases (same handlers)
router.post('/create-order', optionalAuth, createRazorpayOrder);
router.post('/verify', optionalAuth, verifyPayment);

// Webhook — req.body is parsed JSON, req.rawBody (set in server.js) is used for signature verification
router.post('/webhook', webhook);

// Admin: issue full/partial refund for an order's Razorpay payment
router.post('/admin/:id/refund', protect, adminOnly, issueRefund);

module.exports = router;
