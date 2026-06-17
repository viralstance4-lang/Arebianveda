const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const { uploadConcern } = require('../config/cloudinary');
const {
  getActiveConcerns,
  getAllConcerns,
  getConcern,
  createConcern,
  updateConcern,
  deleteConcern,
  reorderConcerns,
} = require('../controllers/concernController');

// Public — storefront homepage
router.get('/active', getActiveConcerns);

// Admin
router.get('/', protect, adminOnly, getAllConcerns);
router.put('/reorder', protect, adminOnly, reorderConcerns);
router.post('/', protect, adminOnly, uploadConcern.single('image'), createConcern);
router.get('/:id', protect, adminOnly, getConcern);
router.put('/:id', protect, adminOnly, uploadConcern.single('image'), updateConcern);
router.delete('/:id', protect, adminOnly, deleteConcern);

module.exports = router;
