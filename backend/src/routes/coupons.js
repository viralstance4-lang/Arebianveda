const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
  validateCoupon,
  getAutoApplyCoupon,
  getAllCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} = require('../controllers/couponController');

// Public — frontend cart uses these
router.post('/validate', validateCoupon);
router.post('/auto-apply', getAutoApplyCoupon);

// Admin CRUD
router.get('/',    protect, adminOnly, getAllCoupons);
router.post('/',   protect, adminOnly, createCoupon);
router.put('/:id', protect, adminOnly, updateCoupon);
router.delete('/:id', protect, adminOnly, deleteCoupon);

module.exports = router;
