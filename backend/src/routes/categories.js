const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
  getPublishedCategories,
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  migrateCategories,
} = require('../controllers/categoryController');

// Public
router.get('/', getPublishedCategories);

// Admin
router.get('/admin', protect, adminOnly, getAllCategories);
router.post('/migrate', protect, adminOnly, migrateCategories);
router.post('/', protect, adminOnly, createCategory);
router.put('/:id', protect, adminOnly, updateCategory);
router.delete('/:id', protect, adminOnly, deleteCategory);

module.exports = router;
