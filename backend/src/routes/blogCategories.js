const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const ctrl = require('../controllers/blogCategoryController');

router.get('/', ctrl.listCategories);
router.post('/', protect, adminOnly, ctrl.createCategory);
router.put('/:id', protect, adminOnly, ctrl.updateCategory);
router.delete('/:id', protect, adminOnly, ctrl.deleteCategory);

module.exports = router;
