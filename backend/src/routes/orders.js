const express = require('express');
const router = express.Router();
const { protect, adminOnly, optionalAuth } = require('../middleware/auth');
const {
  createOrder,
  getMyOrders,
  getOrder,
  getAllOrders,
  getAdminOrder,
  updateOrderStatus,
  updatePaymentStatus,
  deleteOrder,
  getDashboardStats,
  getUnviewedCount,
} = require('../controllers/orderController');

router.post('/', optionalAuth, createOrder);
router.get('/my', protect, getMyOrders);

// Admin routes MUST be before /:id to avoid the catch-all swallowing them
router.get('/admin/all', protect, adminOnly, getAllOrders);
router.get('/admin/stats', protect, adminOnly, getDashboardStats);
router.get('/admin/unviewed-count', protect, adminOnly, getUnviewedCount);
router.get('/admin/:id', protect, adminOnly, getAdminOrder);
router.put('/admin/:id/status', protect, adminOnly, updateOrderStatus);
router.patch('/admin/:id/payment-status', protect, adminOnly, updatePaymentStatus);
router.delete('/admin/:id', protect, adminOnly, deleteOrder);

// Public order tracking by orderId string (no auth required)
// Also before /:id so 'track' isn't treated as an order _id
router.get('/track/:orderId', async (req, res) => {
  const Order = require('../models/Order');
  const order = await Order.findOne({ orderId: req.params.orderId })
    .select('orderId orderStatus paymentMethod paymentStatus shippingAddress items subtotal total discount advancePercentage codPercentage paidOnlineAmount remainingCodAmount trackingNumber trackingUrl statusHistory createdAt deliveredAt');
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  res.json({ success: true, order });
});

// Single order by DB _id — must be LAST so static segments above take priority
router.get('/:id', optionalAuth, getOrder);

module.exports = router;
