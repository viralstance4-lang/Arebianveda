const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const { uploadBanner } = require('../config/cloudinary');
const {
  getActiveBanners,
  getAllBanners,
  getBanner,
  createBanner,
  updateBanner,
  deleteBanner,
  duplicateBanner,
  reorderBanners,
} = require('../controllers/bannerController');

const uploadFields = uploadBanner.fields([
  { name: 'desktopImage', maxCount: 1 },
  { name: 'mobileImage', maxCount: 1 },
]);

// Public — storefront hero slider
router.get('/active', getActiveBanners);

// Admin
router.get('/', protect, adminOnly, getAllBanners);
router.put('/reorder', protect, adminOnly, reorderBanners);
router.post('/', protect, adminOnly, uploadFields, createBanner);
router.get('/:id', protect, adminOnly, getBanner);
router.put('/:id', protect, adminOnly, uploadFields, updateBanner);
router.delete('/:id', protect, adminOnly, deleteBanner);
router.post('/:id/duplicate', protect, adminOnly, duplicateBanner);

module.exports = router;
