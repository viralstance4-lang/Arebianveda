const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');
const {
  getAllProducts,
  getProduct,
  getFeaturedProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImages,
  getRelatedProducts,
} = require('../controllers/productController');

// Short cache for public GET routes — keeps pages snappy but shows updates within seconds
const cachePublic = (_req, res, next) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  next();
};

// Static/specific routes before wildcards
router.get('/', cachePublic, getAllProducts);
router.get('/featured', cachePublic, getFeaturedProducts);

// Admin routes (specific paths before wildcard /:slug)
router.post('/upload/images', protect, adminOnly, upload.array('images', 5), uploadProductImages);
router.post('/', protect, adminOnly, createProduct);

// Wildcard param routes last
router.get('/:slug', getProduct);
router.get('/:id/related', getRelatedProducts);
router.put('/:id', protect, adminOnly, updateProduct);
router.delete('/:id', protect, adminOnly, deleteProduct);

module.exports = router;
