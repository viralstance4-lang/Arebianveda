const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
  getPublicPolicies,
  getPolicyBySlug,
  getAllPolicies,
  createPolicy,
  updatePolicy,
  deletePolicy,
} = require('../controllers/policyController');

// Admin (before /:slug so 'admin' isn't treated as a slug)
router.get('/admin/all', protect, adminOnly, getAllPolicies);
router.post('/', protect, adminOnly, createPolicy);
router.put('/:id', protect, adminOnly, updatePolicy);
router.delete('/:id', protect, adminOnly, deletePolicy);

// Public
router.get('/', getPublicPolicies);
router.get('/:slug', getPolicyBySlug);

module.exports = router;
