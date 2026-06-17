const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const { getPaymentSettings, updatePaymentSettings } = require('../controllers/paymentSettingsController');

// Public — checkout page needs this to decide which methods to show
router.get('/', getPaymentSettings);

// Admin only
router.put('/', protect, adminOnly, updatePaymentSettings);

module.exports = router;
