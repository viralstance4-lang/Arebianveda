const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  register,
  login,
  getProfile,
  updateProfile,
  addAddress,
  updateAddress,
  deleteAddress,
  updatePassword,
  toggleWishlist,
  getWishlist,
  sendOtp,
  verifyOtp,
} = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);

// Phone OTP login
router.post('/otp/send', sendOtp);
router.post('/otp/verify', verifyOtp);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.post('/address', protect, addAddress);
router.put('/address/:addressId', protect, updateAddress);
router.delete('/address/:addressId', protect, deleteAddress);
router.put('/password', protect, updatePassword);
router.get('/wishlist', protect, getWishlist);
router.post('/wishlist/:productId', protect, toggleWishlist);

module.exports = router;
