const express = require('express');
const router = express.Router();
const { protect, adminOnly, optionalAuth } = require('../middleware/auth');
const {
  createReview,
  getProductReviews,
  getPendingReviews,
  approveReview,
  deleteReview,
} = require('../controllers/reviewController');

router.post('/', optionalAuth, createReview);
router.get('/product/:productId', getProductReviews);

// Admin
router.get('/admin/pending', protect, adminOnly, getPendingReviews);
router.put('/admin/:id/approve', protect, adminOnly, approveReview);
router.delete('/admin/:id', protect, adminOnly, deleteReview);

// Admin: get all reviews (with optional status filter)
router.get('/admin/all', protect, adminOnly, async (req, res) => {
  const Review = require('../models/Review');
  const { status } = req.query;
  const query = {};
  if (status === 'approved') query.isApproved = true;
  if (status === 'pending') query.isApproved = false;
  const reviews = await Review.find(query)
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('user', 'name email')
    .populate('product', 'name');
  res.json({ success: true, reviews });
});

// Admin: approve a review (non-prefixed path for frontend compatibility)
router.put('/:id/approve', protect, adminOnly, async (req, res) => {
  const Review = require('../models/Review');
  const review = await Review.findByIdAndUpdate(req.params.id, { isApproved: true }, { new: true });
  if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
  res.json({ success: true, review });
});

// Admin: delete a review (non-prefixed path for frontend compatibility)
router.delete('/:id', protect, adminOnly, deleteReview);

module.exports = router;
