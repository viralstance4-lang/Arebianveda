const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const ctrl = require('../controllers/blogTagController');

router.get('/', ctrl.listTags);
router.post('/', protect, adminOnly, ctrl.createTag);
router.put('/:id', protect, adminOnly, ctrl.updateTag);
router.delete('/:id', protect, adminOnly, ctrl.deleteTag);

module.exports = router;
