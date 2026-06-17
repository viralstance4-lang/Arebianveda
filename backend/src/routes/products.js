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

// Cache middleware for public GET routes (5 min in production)
const cachePublic = (_req, res, next) => {
  if (process.env.NODE_ENV !== 'development') {
    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
  }
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
