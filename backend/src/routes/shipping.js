const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
  health, createShipment, reSyncShipment, shipNow, generateAWB, requestPickup,
  trackOrderAdmin, trackOrderPublic, webhook,
} = require('../controllers/shiprocketController');

// Public
router.get('/track/:orderId', trackOrderPublic);
router.post('/webhook', webhook);

// Admin
router.get('/health',                   protect, adminOnly, health);
router.post('/admin/:id/create',        protect, adminOnly, createShipment);
router.post('/admin/:id/re-sync',       protect, adminOnly, reSyncShipment);
router.post('/admin/:id/ship-now',      protect, adminOnly, shipNow);
router.post('/admin/:id/generate-awb',  protect, adminOnly, generateAWB);
router.post('/admin/:id/request-pickup', protect, adminOnly, requestPickup);
router.get('/admin/:id/track',          protect, adminOnly, trackOrderAdmin);

module.exports = router;
