const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
  getAllFaqs,
  getAllFaqsAdmin,
  createFaq,
  updateFaq,
  deleteFaq,
} = require('../controllers/faqController');

// Public — only active FAQs (used by frontend product page)
router.get('/', getAllFaqs);

// Admin
router.get('/admin', protect, adminOnly, getAllFaqsAdmin);
router.post('/', protect, adminOnly, createFaq);
router.put('/:id', protect, adminOnly, updateFaq);
router.delete('/:id', protect, adminOnly, deleteFaq);

module.exports = router;
